using backend.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Services;

public sealed class ReminderService
{
    private readonly AppDBContext _db;
    private readonly NotificationDispatcher _dispatcher;
    private readonly ILogger<ReminderService> _logger;

    public ReminderService(AppDBContext db, NotificationDispatcher dispatcher, ILogger<ReminderService> logger)
    {
        _db = db;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    #region Methods
    private async Task SendOnceAsync(long userId, string kind, string entityType, long entityId, string title, string message, string targetUrl, CancellationToken ct)
    {
        var inserted = await _db.Database.SqlQueryRaw<int>(
            """
            INSERT INTO reminder_deliveries
                (user_id, reminder_kind, entity_type, entity_id, created_at)
            VALUES
                ({0}, {1}, {2}, {3}, {4})
            ON CONFLICT
                (user_id, reminder_kind, entity_type, entity_id)
            DO NOTHING
            RETURNING 1 AS "Value"
            """,
            userId, kind, entityType, entityId, DateTime.UtcNow).ToListAsync(ct);

        if (inserted.Count == 0)
            return;

        _logger.LogInformation("Reminder {Kind} for {EntityType} {EntityId} user {UserId}", kind, entityType, entityId, userId);
        await _dispatcher.ToUserAsync(userId, "reminder", title, message, targetUrl);
    }
    #endregion

    public async Task CheckAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var taskDeadline = now.AddHours(24);
        var eventDeadline = now.AddHours(1);
        var today = DateOnly.FromDateTime(now);
        var tomorrow = today.AddDays(1);

        var tasks = await _db.Tasks.AsNoTracking()
            .Where(t => t.DueDate != null && t.DueDate > now && t.DueDate <= taskDeadline && t.Status != "completed" && t.Status != "cancelled")
            .Select(t => new { t.Id, t.UserId, t.Title, t.DueDate }).ToListAsync(ct);

        foreach (var task in tasks)
            await SendOnceAsync(task.UserId, "task_due_24h", "task", task.Id, "Наближається дедлайн завдання", $"Завдання «{task.Title}» має дедлайн {task.DueDate:dd.MM.yyyy HH:mm} (UTC).", "/tasks", ct);

        var goals = await _db.Goals.AsNoTracking().Where(g => g.Deadline == tomorrow && g.Status != "completed" && g.Status != "cancelled")
            .Select(g => new { g.Id, g.UserId, g.Title }).ToListAsync(ct);

        foreach (var goal in goals)
            await SendOnceAsync(goal.UserId, "goal_due_tomorrow", "goal", goal.Id, "Завтра дедлайн цілі", $"Термін досягнення цілі «{goal.Title}» спливає завтра.", "/goals", ct);

        var events = await _db.ClubEvents.AsNoTracking().Where(e => e.StartsAt > now && e.StartsAt <= eventDeadline)
            .Select(e => new { e.Id, e.ClubId, e.Title }).ToListAsync(ct);

        foreach (var clubEvent in events)
        {
            var participantIds = await _db.ClubEventParticipants.AsNoTracking().Where(p => p.EventId == clubEvent.Id).Select(p => p.UserId).Distinct().ToListAsync(ct);
            foreach (var userId in participantIds)
                await SendOnceAsync(userId, "club_event_1h", "club_event", clubEvent.Id, "Подія клубу незабаром почнеться", $"Подія «{clubEvent.Title}» розпочнеться протягом години.", $"/clubs/{clubEvent.ClubId}", ct);
        }

        var overdue = await _db.Tasks.AsNoTracking().Where(t => t.DueDate != null && t.DueDate <= now && t.Status != "completed" && t.Status != "cancelled")
            .Select(t => new { t.Id, t.UserId, t.Title }).ToListAsync(ct);

        foreach (var task in overdue)
            await SendOnceAsync(task.UserId, "task_overdue", "task", task.Id, "Прострочене завдання", $"Термін виконання завдання «{task.Title}» минув.", "/tasks", ct);
    }
}
