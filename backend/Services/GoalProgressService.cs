using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class GoalProgressService
{
    private readonly AppDBContext _context;
    private readonly GamificationService _gamification;

    public GoalProgressService(AppDBContext context, GamificationService gamification)
    {
        _context = context;
        _gamification = gamification;
    }

    #region Methods
    private static bool IsTaskFinished(UserTask task)
    {
        if (!task.IsRecurring)
            return task.Status == "completed";

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return task.EndDate.HasValue && today >= task.EndDate.Value && task.Occurrences.Count > 0 && task.Occurrences.All(o => o.IsCompleted);
    }

    private static decimal GetTaskProgress(UserTask task)
    {
        if (!task.IsRecurring)
            return task.Status == "completed" ? 100m : 0m;

        int total = task.Occurrences.Count;
        if (total == 0)
            return 0m;

        int completed = task.Occurrences.Count(o => o.IsCompleted);
        return Math.Round((decimal)completed / total * 100m, 2);
    }
    #endregion

    public async Task RecalculateAsync(long goalId)
    {
        var goal = await _context.Goals.Include(g => g.Milestones).Include(g => g.Tasks).ThenInclude(t => t.Occurrences).AsSplitQuery().FirstOrDefaultAsync(g => g.Id == goalId);
        if (goal == null)
            return;

        var now = DateTime.UtcNow;
        foreach (var milestone in goal.Milestones)
        {
            var tasks = goal.Tasks.Where(t => t.MilestoneId == milestone.Id).ToList();
            if (tasks.Count == 0)
            {
                milestone.Progress = milestone.IsCompleted ? 100m : 0m;
                continue;
            }

            decimal totalProgress = tasks.Sum(GetTaskProgress);
            milestone.Progress = Math.Round(totalProgress / tasks.Count, 2);
            bool completed = tasks.All(IsTaskFinished);
            milestone.IsCompleted = completed;
            milestone.CompletedAt = completed ? milestone.CompletedAt ?? now : null;
        }

        var directTasks = goal.Tasks.Where(t => t.MilestoneId == null).ToList();
        int totalUnits = goal.Milestones.Count + directTasks.Count;
        if (totalUnits > 0)
        {
            decimal totalProgress = goal.Milestones.Sum(m => m.Progress);
            totalProgress += directTasks.Sum(GetTaskProgress);
            goal.Progress = Math.Round(totalProgress / totalUnits, 2);

            if (goal.Status != "cancelled" && goal.Status != "planned")
            {
                bool allCompleted = goal.Milestones.All(m => m.IsCompleted) && directTasks.All(IsTaskFinished);
                goal.Status = allCompleted ? "completed" : "active";
            }
        }
        else
        {
            goal.Progress = goal.Status == "completed" ? 100m : 0m;
        }

        goal.UpdatedAt = now;
        await _context.SaveChangesAsync();
    }

    public async Task RecalculateWithRewardsAsync(long goalId, long userId)
    {
        var before = await _context.Goals.AsNoTracking().Where(g => g.Id == goalId && g.UserId == userId)
            .Select(g => new
            {
                g.Status,
                Milestones = g.Milestones.Select(m => new { m.Id, m.IsCompleted }).ToList()
            }).FirstOrDefaultAsync();

        if (before == null)
            return;

        await RecalculateAsync(goalId);

        var after = await _context.Goals.AsNoTracking().Where(g => g.Id == goalId)
            .Select(g => new
            {
                g.Status,
                Milestones = g.Milestones.Select(m => new { m.Id, m.IsCompleted }).ToList()
            }).FirstAsync();

        foreach (var milestone in after.Milestones)
        {
            bool wasCompleted = before.Milestones.Any(m => m.Id == milestone.Id && m.IsCompleted);
            if (!wasCompleted && milestone.IsCompleted)
                await _gamification.AwardXpOnceAsync(userId, 30, $"Завершення етапу #{milestone.Id}");
        }

        if (before.Status != "completed" && after.Status == "completed")
            await _gamification.AwardXpOnceAsync(userId, 100, $"Завершення цілі #{goalId}");
    }
}
