using System.Security.Claims;
using backend.Data;
using backend.DTOs.GroupGoals;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/group-goals")]
public class GroupGoalsController : ControllerBase
{
    private readonly AppDBContext _db;
    private readonly GamificationService _gamification;
    private readonly ClubRatingService _rating;
    private readonly NotificationDispatcher _notifications;
    public GroupGoalsController(AppDBContext db, GamificationService gamification, ClubRatingService rating, NotificationDispatcher notifications)
    {
        _db = db;
        _gamification = gamification;
        _rating = rating;
        _notifications = notifications;
    }

    #region Methods

    private long? UserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private Task<ClubMember?> GetMembership(long clubId, long userId)
    {
        return _db.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");
    }

    private static bool CanManageGoal(ClubMember member)
    {
        return member.Role is "owner" or "admin" or "moderator";
    }

    private Task<GroupGoal?> GetGoal(long clubId, long goalId)
    {
        return _db.GroupGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.ClubId == clubId);
    }

    private static readonly string[] AllowedStatuses =
    {
        "planned", "active", "completed", "cancelled"
    };

    private static bool IsValidInput(GroupGoalInputDto dto)
    {
        return !string.IsNullOrWhiteSpace(dto.Title) && dto.EndDate >= dto.StartDate;
    }

    private async Task<object> MapToDtoAsync(GroupGoal goal, long userId, bool includeParticipants = false)
    {
        var participants = await _db.GroupGoalParticipants.AsNoTracking().Where(p => p.GroupGoalId == goal.Id).Select(p => new
        {
            p.Id,
            p.UserId,
            p.JoinedAt
        }).ToListAsync();

        var taskIds = await _db.GroupGoalTasks.AsNoTracking().Where(t => t.GroupGoalId == goal.Id).Select(t => t.Id).ToListAsync();

        int totalTasks = taskIds.Count;

        var participantIds = participants.Select(p => p.UserId).ToList();
        var completions = await _db.GroupGoalTaskCompletions.AsNoTracking().Where(c => taskIds.Contains(c.GroupGoalTaskId) && participantIds.Contains(c.UserId)).Select(c => new
        {
            c.UserId,
            c.GroupGoalTaskId
        }).ToListAsync();

        var completedByUser = completions.GroupBy(c => c.UserId).ToDictionary(g => g.Key,
                g => g.Count());

        decimal GetProgress(long participantUserId)
        {
            if (totalTasks == 0)
                return 0;

            completedByUser.TryGetValue(participantUserId, out int completed);

            return Math.Round((decimal)completed * 100 / totalTasks, 2);
        }

        bool isParticipant = participantIds.Contains(userId);

        decimal myProgress = isParticipant ? GetProgress(userId) : 0;

        int myCompletedTasks = isParticipant ? completedByUser.GetValueOrDefault(userId) : 0;

        decimal groupProgress = participants.Count == 0 ? 0 : Math.Round(participants.Average(p => GetProgress(p.UserId)), 2);

        int completedParticipants = totalTasks == 0 ? 0 : participants.Count(p => GetProgress(p.UserId) == 100);

        var participantDetails = includeParticipants ? participants.Select(p => new
        {
            p.Id,
            p.UserId,
            p.JoinedAt,
            Progress = GetProgress(p.UserId),
            CompletedTasks = completedByUser.GetValueOrDefault(p.UserId),
            IsCompleted = totalTasks > 0 && GetProgress(p.UserId) == 100
        }).ToList() : null;

        return new
        {
            goal.Id,
            goal.ClubId,
            goal.Title,
            goal.Description,
            goal.StartDate,
            goal.EndDate,
            goal.Status,
            goal.CreatedAt,
            Progress = groupProgress,
            TasksCount = totalTasks,
            ParticipantsCount = participants.Count,
            CompletedParticipants = completedParticipants,
            IsParticipant = isParticipant,
            MyProgress = myProgress,
            MyCompletedTasks = myCompletedTasks,
            IsPersonallyCompleted = isParticipant && totalTasks > 0 && myCompletedTasks == totalTasks,

            Participants = participantDetails
        };
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetGroupGoals(long clubId)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null)
            return Forbid();

        var goals = await _db.GroupGoals.AsNoTracking().Where(g => g.ClubId == clubId).OrderByDescending(g => g.CreatedAt).ToListAsync();

        var result = new List<object>();

        foreach (var goal in goals)

            result.Add(await MapToDtoAsync(goal, userId));

        return Ok(result);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGroupGoal(long clubId, long id)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null)
            return Forbid();

        var goal = await GetGoal(clubId, id);

        if (goal == null)
            return NotFound(new { message = "Групову ціль не знайдено." });

        return Ok(await MapToDtoAsync(goal, userId, includeParticipants: true));
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroupGoal(long clubId,
        [FromBody] GroupGoalInputDto dto)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null || !CanManageGoal(membership))
            return Forbid();

        if (!IsValidInput(dto))
            return BadRequest(new { message = "Перевірте назву та дати цілі." });

        var goal = new GroupGoal
        {
            ClubId = clubId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            TargetValue = 1,
            CurrentValue = 0,
            Unit = "tasks"
        };

        _db.GroupGoals.Add(goal);
        await _db.SaveChangesAsync();

        await _notifications.ToClubAsync(clubId, "group_goal_created", "Нова групова ціль", $"У клубі створено групову ціль «{goal.Title}». Долучайся до її виконання!", $"/clubs/{clubId}/group-goals/{goal.Id}", excludeUserId: userId);

        return CreatedAtAction(nameof(GetGroupGoal), new { clubId, id = goal.Id }, await MapToDtoAsync(goal, userId));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateGroupGoal(long clubId, long id,
        [FromBody] GroupGoalInputDto dto)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null || !CanManageGoal(membership))
            return Forbid();

        var goal = await GetGoal(clubId, id);

        if (goal == null)
            return NotFound(new { message = "Групову ціль не знайдено." });

        if (!IsValidInput(dto))
            return BadRequest(new { message = "Перевірте назву та дати цілі." });

        if (!AllowedStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Некоректний статус цілі." });

        goal.Title = dto.Title.Trim();
        goal.Description = dto.Description?.Trim();
        goal.StartDate = dto.StartDate;
        goal.EndDate = dto.EndDate;
        goal.Status = dto.Status;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Групову ціль оновлено.",
            goal = await MapToDtoAsync(goal, userId)
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteGroupGoal(long clubId, long id)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null || !CanManageGoal(membership))
            return Forbid();

        var goal = await GetGoal(clubId, id);

        if (goal == null)
            return NotFound(new { message = "Групову ціль не знайдено." });

        var taskIds = await _db.GroupGoalTasks.Where(t => t.GroupGoalId == goal.Id).Select(t => t.Id).ToListAsync();

        await using var transaction = await _db.Database.BeginTransactionAsync();

        await _db.ClubPointTransactions.Where(p => p.ClubId == clubId && p.ActionType == "group_task" && taskIds.Contains(p.SourceId)).ExecuteDeleteAsync();

        _db.GroupGoals.Remove(goal);
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new { message = "Групову ціль видалено." });
    }

    [HttpPost("{id:long}/join")]
    public async Task<IActionResult> JoinGroupGoal(long clubId, long id)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null)
            return Forbid();

        var goal = await GetGoal(clubId, id);

        if (goal == null)
            return NotFound(new { message = "Групову ціль не знайдено." });

        if (goal.Status != "active")
            return BadRequest(new { message = "До цієї цілі зараз не можна долучитися." });

        var alreadyJoined = await _db.GroupGoalParticipants.AnyAsync(p => p.GroupGoalId == id && p.UserId == userId);

        if (alreadyJoined)
            return Conflict(new { message = "Ви вже берете участь у цілі." });

        var participant = new GroupGoalParticipant
        {
            GroupGoalId = id,
            UserId = userId,
            Contribution = 0,
            JoinedAt = DateTime.UtcNow
        };

        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            _db.GroupGoalParticipants.Add(participant);

            await _db.SaveChangesAsync();

            await _rating.AwardGroupGoalJoinAsync(clubId, userId, id);

            await _gamification.AwardXpOnceAsync(userId, 5, $"group_goal_join:{id}");

            await _gamification.RegisterActivityAsync(userId);

            await transaction.CommitAsync();
        }

        return Ok(new
        {
            message = "Ви долучилися до групової цілі.",
            goal = await MapToDtoAsync(goal, userId)
        });
    }

    [HttpDelete("{id:long}/leave")]
    public async Task<IActionResult> LeaveGroupGoal(long clubId, long id)
    {
        if (UserId is not long userId)
            return Unauthorized();

        var membership = await GetMembership(clubId, userId);

        if (membership == null)
            return Forbid();

        var goal = await GetGoal(clubId, id);

        if (goal == null)
            return NotFound(new { message = "Групову ціль не знайдено." });

        var participant = await _db.GroupGoalParticipants.FirstOrDefaultAsync(p => p.GroupGoalId == id && p.UserId == userId);

        if (participant == null)
            return NotFound(new { message = "Ви не берете участі в цій цілі." });
        var taskIds = await _db.GroupGoalTasks.Where(t => t.GroupGoalId == id).Select(t => t.Id).ToListAsync();

        if (await _db.GroupGoalTaskSubmissions.AnyAsync(s => s.UserId == userId && taskIds.Contains(s.GroupGoalTaskId)))
            return Conflict(new { message = "Неможливо залишити ціль, для якої вже надіслано звіти." });

        var completions = await _db.GroupGoalTaskCompletions.Where(c => c.UserId == userId && taskIds.Contains(c.GroupGoalTaskId)).ToListAsync();

        _db.GroupGoalTaskCompletions.RemoveRange(completions);
        _db.GroupGoalParticipants.Remove(participant);

        await _db.SaveChangesAsync();

        return Ok(new { message = "Ви залишили групову ціль." });
    }
}
