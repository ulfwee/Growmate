using backend.Data;
using backend.Models;
using backend.DTOs.XP;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace backend.Services;

public class GamificationService
{
    private readonly AppDBContext _context;
    private readonly NotificationDispatcher _notifications;

    public GamificationService(AppDBContext context, NotificationDispatcher notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    private readonly List<PendingGamificationNotification> _pendingNotifications = new();

    private record PendingGamificationNotification(long UserId, string Type, string Title, string Message, string TargetUrl);

    #region Methods

    private void QueueLevelUp(long userId, int previousXp, int currentXp)
    {
        var previousLevel = GetLevel(previousXp);
        var currentLevel = GetLevel(currentXp);
        if (currentLevel <= previousLevel) return;

        _pendingNotifications.Add(new(
            userId, "level_up", "Новий рівень!",
            $"Вітаємо! Ти досягнув {currentLevel} рівня!", "/statistics"));
    }

    #endregion

    public void ClearPendingNotifications() => _pendingNotifications.Clear();

    public async Task PublishPendingNotificationsAsync()
    {
        if (_context.Database.CurrentTransaction != null)
            throw new InvalidOperationException(
                "Сповіщення можна надсилати лише після завершення транзакції.");

        var pending = _pendingNotifications.ToArray();
        _pendingNotifications.Clear();

        foreach (var item in pending)
        {
            try
            {
                await _notifications.ToUserAsync(
                    item.UserId, item.Type, item.Title, item.Message, item.TargetUrl);
            }
            catch (Exception)
            {
            }
        }
    }

    private async Task<int> LockAndGetXpAsync(long userId)
    {
        var values = await _context.Database.SqlQueryRaw<int>(
            "SELECT total_xp AS \"Value\" FROM user_profiles WHERE user_id = {0} FOR UPDATE",
            userId).ToListAsync();
        if (values.Count != 1)
            throw new InvalidOperationException("Профіль користувача не знайдено.");
        return values[0];
    }

    public async Task AwardXpAsync(long userId, int amount, string reason)
    {
        if (amount <= 0)
            throw new ArgumentException("Кількість XP повинна бути більшою за 0.");

        bool external = _context.Database.CurrentTransaction != null;
        var transaction = external ? null :
            await _context.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var pendingStart = _pendingNotifications.Count;
        bool committed = false;
        try
        {
            int previousXp = await LockAndGetXpAsync(userId);
            await _context.UserProfiles.Where(p => p.UserId == userId)
                .ExecuteUpdateAsync(x => x.SetProperty(p => p.TotalXp, p => p.TotalXp + amount));

            _context.UserXpHistory.Add(new UserXpHistory
            {
                UserId = userId,
                XpAmount = amount,
                Reason = reason,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            var tracked = _context.UserProfiles.Local.FirstOrDefault(p => p.UserId == userId);
            if (tracked != null) await _context.Entry(tracked).ReloadAsync();
            QueueLevelUp(userId, previousXp, previousXp + amount);
            if (transaction != null) await transaction.CommitAsync();
            committed = true;
        }
        catch
        {
            if (transaction != null)
            {
                if (!committed) await transaction.RollbackAsync();
                _pendingNotifications.RemoveRange(pendingStart,
                    _pendingNotifications.Count - pendingStart);
            }
            throw;
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
                if (committed) await PublishPendingNotificationsAsync();
            }
        }
    }

    public async Task<bool> AwardXpOnceAsync(
        long userId,
        int amount,
        string reason)
    {
        if (amount <= 0)
            throw new ArgumentException(
                "Кількість XP повинна бути більшою за 0.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException(
                "Причина нарахування XP обов'язкова.");
        var hasExternalTransaction =
            _context.Database.CurrentTransaction != null;

        var transaction = hasExternalTransaction
            ? null
            : await _context.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted);

        var pendingStart = _pendingNotifications.Count;
        var committed = false;
        try
        {
            int previousXp = await LockAndGetXpAsync(userId);
            var inserted = await _context.Database
                .SqlQueryRaw<int>(
                    """
                INSERT INTO user_xp_history
                    (user_id, xp_amount, reason, created_at)
                VALUES
                    ({0}, {1}, {2}, {3})
                ON CONFLICT (user_id, reason)
                DO NOTHING
                RETURNING 1 AS "Value"
                """,
                    userId,
                    amount,
                    reason,
                    DateTime.UtcNow)
                .ToListAsync();

            if (inserted.Count == 0)
            {
                if (transaction != null)
                    await transaction.CommitAsync();

                return false;
            }

            var affected = await _context.UserProfiles
                .Where(p => p.UserId == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(
                        p => p.TotalXp,
                        p => p.TotalXp + amount));

            if (affected != 1)
                throw new InvalidOperationException(
                    "Профіль користувача не знайдено.");

            QueueLevelUp(userId, previousXp, previousXp + amount);
            var trackedProfile = _context.UserProfiles.Local
                .FirstOrDefault(p => p.UserId == userId);

            if (trackedProfile != null)
            {
                var entry = _context.Entry(trackedProfile);

                await entry.ReloadAsync();
            }

            await UpdateStreakAsync(userId);
            await CheckAchievementsAsync(userId);

            if (transaction != null)
                await transaction.CommitAsync();

            committed = true;
            return true;
        }
        catch
        {
            if (transaction != null)
            {
                if (!committed) await transaction.RollbackAsync();
                _pendingNotifications.RemoveRange(pendingStart,
                    _pendingNotifications.Count - pendingStart);
            }
            throw;
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
                if (committed)
                    await PublishPendingNotificationsAsync();
            }
        }
    }

    public async Task<bool> UnlockAchievementAsync(
        long userId,
        long achievementId)
    {
        var achievement = await _context.Achievements
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == achievementId);

        if (achievement == null)
        {
            return false;
        }

        var hasExternalTransaction =
            _context.Database.CurrentTransaction != null;

        var transaction = hasExternalTransaction
            ? null
            : await _context.Database.BeginTransactionAsync();

        var pendingStart = _pendingNotifications.Count;
        var committed = false;
        try
        {
            int previousXp = await LockAndGetXpAsync(userId);
            var inserted = await _context.Database
                .SqlQueryRaw<int>(
                    """
                INSERT INTO user_achievements
                    (user_id, achievement_id, earned_at)
                VALUES
                    ({0}, {1}, {2})
                ON CONFLICT (user_id, achievement_id)
                DO NOTHING
                RETURNING 1 AS "Value"
                """,
                    userId,
                    achievementId,
                    DateTime.UtcNow)
                .ToListAsync();

            if (inserted.Count == 0)
            {
                if (transaction != null)
                    await transaction.CommitAsync();

                return false;
            }

            _pendingNotifications.Add(new(
                userId,
                "achievement",
                "Нове досягнення!",
                achievement.XpReward > 0
                    ? $"Ти отримав досягнення «{achievement.Name}» та {achievement.XpReward} XP!"
                    : $"Ти отримав досягнення «{achievement.Name}»!",
                "/achievements"
            ));

            if (achievement.XpReward > 0)
            {
                var affected = await _context.UserProfiles
                    .Where(p => p.UserId == userId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(
                            p => p.TotalXp,
                            p => p.TotalXp + achievement.XpReward));

                if (affected != 1)
                    throw new InvalidOperationException(
                        "Профіль користувача не знайдено.");

                QueueLevelUp(userId, previousXp, previousXp + achievement.XpReward);

                _context.UserXpHistory.Add(new UserXpHistory
                {
                    UserId = userId,
                    XpAmount = achievement.XpReward,
                    Reason = $"Отримано досягнення: {achievement.Name}",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();

                var trackedProfile = _context.UserProfiles.Local
                    .FirstOrDefault(p => p.UserId == userId);

                if (trackedProfile != null)
                    await _context.Entry(trackedProfile).ReloadAsync();
            }

            if (transaction != null)
                await transaction.CommitAsync();

            committed = true;
            return true;
        }
        catch
        {
            if (transaction != null)
            {
                if (!committed) await transaction.RollbackAsync();
                _pendingNotifications.RemoveRange(pendingStart,
                    _pendingNotifications.Count - pendingStart);
            }
            throw;
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
                if (committed)
                    await PublishPendingNotificationsAsync();
            }
        }
    }

    public async Task CheckAchievementsAsync(long userId)
    {
        var goalsCount = await _context.Goals
            .CountAsync(g => g.UserId == userId);

        var completedGoals = await _context.Goals
            .CountAsync(g =>
                g.UserId == userId &&
                g.Status == "completed");

        var completedTasks = await _context.Tasks
            .CountAsync(t =>
                t.UserId == userId &&
                t.Status == "completed");

        var postsCount = await _context.Posts
            .CountAsync(p => p.UserId == userId);

        var activeClubsCount = await _context.ClubMembers
            .CountAsync(cm =>
                cm.UserId == userId &&
                cm.Status == "active");

        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return;

        var codes = new List<string>();

        if (goalsCount >= 1)
            codes.Add("FIRST_GOAL_CREATED");

        if (completedTasks >= 1)
            codes.Add("FIRST_TASK");

        if (activeClubsCount >= 1)
            codes.Add("FIRST_CLUB");

        if (postsCount >= 1)
            codes.Add("FIRST_POST");

        if (profile.LongestStreak >= 7)
            codes.Add("STREAK_7");

        if (completedGoals >= 1)
            codes.Add("FIRST_GOAL");

        if (postsCount >= 5)
            codes.Add("POSTS_5");

        var achievements = await _context.Achievements
            .Where(a => codes.Contains(a.Code))
            .ToListAsync();

        var earnedIds = await _context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .Select(ua => ua.AchievementId)
            .ToListAsync();

        var earnedSet = earnedIds.ToHashSet();

        foreach (var achievement in achievements)
        {
            bool alreadyEarned = earnedSet.Contains(achievement.Id);
            if (alreadyEarned)
                continue;

            if (await UnlockAchievementAsync(userId, achievement.Id))
                earnedSet.Add(achievement.Id);
        }
    }

    public async Task UpdateStreakAsync(long userId)
    {
        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
            return;

        DateTime today = DateTime.UtcNow.Date;

        if (profile.LastActivityDate?.Date == today)
            return;

        if (profile.LastActivityDate == null) profile.CurrentStreak = 1;
        else
        {
            DateTime lastActivity = profile.LastActivityDate.Value.Date;
            DateTime yesterday = today.AddDays(-1);

            if (lastActivity == yesterday)
                profile.CurrentStreak++;
            else
                profile.CurrentStreak = 1;
        }

        profile.LastActivityDate = today;

        if (profile.CurrentStreak > profile.LongestStreak)
            profile.LongestStreak = profile.CurrentStreak;

        await _context.SaveChangesAsync();
    }

    public static int GetActualStreak(int currentStreak, DateTime? lastActivityDate)
    {
        if (lastActivityDate == null)
            return 0;

        var today = DateTime.UtcNow.Date;
        var lastActivity = lastActivityDate.Value.Date;

        var daysDifference = (today - lastActivity).Days;

        if (daysDifference == 0 || daysDifference == 1)
            return currentStreak;

        return 0;
    }

    public async Task RegisterActivityAsync(long userId)
    {
        await UpdateStreakAsync(userId);
        await CheckAchievementsAsync(userId);
    }

    public static int GetRequiredXp(int level)
    {
        if (level < 1)
            throw new ArgumentOutOfRangeException(nameof(level));

        return 50 * (level - 1) * level;
    }

    public static int GetLevel(int totalXp)
    {
        totalXp = Math.Max(0, totalXp);

        int level = 1;

        while (GetRequiredXp(level + 1) <= totalXp)
        {
            level++;
        }

        return level;
    }

    public static LevelProgressDto GetLevelProgress(int totalXp)
    {
        totalXp = Math.Max(0, totalXp);

        int level = GetLevel(totalXp);

        int currentLevelXp = GetRequiredXp(level);
        int nextLevelXp = GetRequiredXp(level + 1);

        int xpInLevel = totalXp - currentLevelXp;
        int xpForNextLevel = nextLevelXp - currentLevelXp;

        return new LevelProgressDto
        {
            Level = level,
            TotalXp = totalXp,
            XpInLevel = xpInLevel,
            XpForNextLevel = xpForNextLevel,
            XpRemaining = nextLevelXp - totalXp,
            ProgressPercent = (int)Math.Floor(
                xpInLevel * 100.0 / xpForNextLevel
            )
        };
    }

}
