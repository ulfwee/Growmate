using System.Security.Claims;
using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

public class UpdateOccurrenceDto
{
    public bool IsCompleted { get; set; }
}

[ApiController]
[Route("api/tasks/{taskId:long}/occurrences")]
[Authorize]
public class TaskOccurrencesController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly TaskRecurrenceService _recurrence;
    private readonly GoalProgressService _progress;
    private readonly GamificationService _gamification;

    public TaskOccurrencesController(AppDBContext context, TaskRecurrenceService recurrence, GoalProgressService progress, GamificationService gamification)
    {
        _context = context;
        _recurrence = recurrence;
        _progress = progress;
        _gamification = gamification;
    }

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetOccurrences(long taskId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var task = await _context.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null) return NotFound(new { message = "Завдання не знайдено." });
        if (!task.IsRecurring) return BadRequest(new { message = "Це завдання не є повторюваним." });

        var occurrences = await _context.TaskOccurrences.AsNoTracking().Where(o => o.TaskId == taskId).OrderBy(o => o.ScheduledDate).Select(o => new
        {
            o.Id,
            o.ScheduledDate,
            o.IsCompleted,
            o.CompletedAt
        }).ToListAsync();

        var progress = await _recurrence.GetProgressAsync(taskId);
        return Ok(new { taskId, progress, occurrences });
    }

    [HttpPatch("{date}/completion")]
    public async Task<IActionResult> ChangeCompletion(long taskId, string date, [FromBody] UpdateOccurrenceDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var scheduledDate)) return BadRequest(new { message = "Некоректна дата. Формат: yyyy-MM-dd." });

        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null) return NotFound(new { message = "Завдання не знайдено." });
        if (!task.IsRecurring) return BadRequest(new { message = "Завдання не є повторюваним." });

        var occurrence = await _context.TaskOccurrences.AsNoTracking().FirstOrDefaultAsync(o => o.TaskId == taskId && o.ScheduledDate == scheduledDate);
        if (occurrence == null) return NotFound(new { message = "Виконання на цю дату не знайдено." });

        bool newlyCompleted = !occurrence.IsCompleted && dto.IsCompleted;
        bool updated = await _recurrence.SetOccurrenceCompletionAsync(taskId, scheduledDate, dto.IsCompleted, userId);
        if (!updated) return BadRequest(new { message = "Не вдалося змінити виконання. " + "Перевірте дату завдання." });
        if (task.GoalId.HasValue) await _progress.RecalculateWithRewardsAsync(task.GoalId.Value, userId);

        if (newlyCompleted)
        {
            await _gamification.AwardXpOnceAsync(userId, 5, $"Виконання завдання #{taskId} за {scheduledDate:yyyy-MM-dd}");
            await _gamification.RegisterActivityAsync(userId);
        }

        var progress = await _recurrence.GetProgressAsync(taskId);
        return Ok(new
        {
            message = dto.IsCompleted ? "Виконання зараховано." : "Виконання скасовано.",
            taskId,
            scheduledDate,
            isCompleted = dto.IsCompleted,
            progress
        });
    }
}