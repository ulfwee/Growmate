using System.Security.Claims;
using backend.Data;
using backend.DTOs.Tasks;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly GamificationService _gamification;
    private readonly GoalProgressService _progress;
    private readonly GoalDateValidationService _dateValidation;
    private readonly TaskRecurrenceService _recurrence;

    public TasksController(AppDBContext context, GamificationService gamification, GoalProgressService progress, GoalDateValidationService dateValidation, TaskRecurrenceService recurrence)
    {
        _context = context;
        _gamification = gamification;
        _progress = progress;
        _dateValidation = dateValidation;
        _recurrence = recurrence;
    }

    #region Methods

    private bool TryGetUserId(out long userId)
    {
        return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }

    private static readonly string[] AllowedStatuses =
    {
        "pending", "in_progress", "completed", "cancelled"
    };

    private static readonly string[] AllowedPriorities =
    {
        "low", "medium", "high"
    };

    private static UserTaskDto MapToDto(UserTask task)
    {
        return new UserTaskDto
        {
            Id = task.Id,
            GoalId = task.GoalId,
            GoalTitle = task.Goal?.Title,
            MilestoneId = task.MilestoneId,
            MilestoneTitle = task.Milestone?.Title,
            Title = task.Title,
            Description = task.Description,
            StartDate = task.StartDate,
            EndDate = task.EndDate,
            DueDate = task.DueDate,
            Priority = task.Priority,
            Status = task.Status,
            IsRecurring = task.IsRecurring,
            RecurrenceRule = task.RecurrenceRule,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            CompletedAt = task.CompletedAt
        };
    }

    private async Task<string?> ValidateRelations(long? goalId, long? milestoneId, long userId)
    {
        if (milestoneId.HasValue && !goalId.HasValue)
            return "Для проміжного етапу потрібно вказати основну ціль.";

        if (goalId.HasValue)
        {
            bool ownsGoal = await _context.Goals.AnyAsync(g => g.Id == goalId.Value &&
                     g.UserId == userId);

            if (!ownsGoal)
                return "Ціль не знайдено або вона вам не належить.";
        }

        if (milestoneId.HasValue)
        {
            bool validMilestone =
                await _context.GoalMilestones.AnyAsync(m => m.Id == milestoneId.Value &&
                         m.GoalId == goalId!.Value);

            if (!validMilestone)
                return "Проміжний етап не належить вибраній цілі.";
        }

        return null;
    }

    private static string? ValidateTask(string title, string priority, bool isRecurring, string? recurrenceRule)
    {
        if (string.IsNullOrWhiteSpace(title))
            return "Назва завдання обов'язкова.";

        if (title.Trim().Length > 200)
            return "Назва не може перевищувати 200 символів.";

        if (!AllowedPriorities.Contains(priority))
            return "Некоректний пріоритет.";

        if (isRecurring && !TaskRecurrenceService.IsValidRule(recurrenceRule))
        {
            return "Допустимі правила повторення: daily або weekly.";
        }

        return null;
    }

    private async Task RecalculateGoal(long? goalId, long userId)
    {
        if (goalId.HasValue)
            await _progress.RecalculateWithRewardsAsync(goalId.Value, userId);
    }

    private async Task LoadRelations(UserTask task)
    {
        await _context.Entry(task)
            .Reference(t => t.Goal).LoadAsync();

        await _context.Entry(task)
            .Reference(t => t.Milestone).LoadAsync();
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] string? status, [FromQuery] long? goalId, [FromQuery] long? milestoneId)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!string.IsNullOrWhiteSpace(status) && !AllowedStatuses.Contains(status))
        {
            return BadRequest(new { message = "Некоректний статус завдання." });
        }

        var query = _context.Tasks.AsNoTracking().Include(t => t.Goal).Include(t => t.Milestone).Where(t => t.UserId == userId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        if (goalId.HasValue)
            query = query.Where(t => t.GoalId == goalId.Value);

        if (milestoneId.HasValue)
            query = query.Where(
                t => t.MilestoneId == milestoneId.Value);

        var tasks = await query.OrderBy(t => t.Status == "completed").ThenBy(t => t.DueDate).ThenByDescending(t => t.CreatedAt).ToListAsync();

        return Ok(tasks.Select(MapToDto));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTask(long id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var task = await _context.Tasks.AsNoTracking().Include(t => t.Goal).Include(t => t.Milestone).FirstOrDefaultAsync(t => t.Id == id &&
                     t.UserId == userId);

        if (task == null)
        {
            return NotFound(new { message = "Завдання не знайдено." });
        }

        return Ok(MapToDto(task));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateUserTaskDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var validation = ValidateTask(dto.Title, dto.Priority, dto.IsRecurring, dto.RecurrenceRule);

        if (validation != null)
            return BadRequest(new { message = validation });

        var relationError = await ValidateRelations(dto.GoalId, dto.MilestoneId, userId);

        if (relationError != null)
            return BadRequest(new { message = relationError });

        var dateError = await _dateValidation.ValidateTaskAsync(dto.GoalId, dto.MilestoneId, dto.StartDate, dto.EndDate, dto.DueDate, dto.IsRecurring);

        if (dateError != null)
            return BadRequest(new { message = dateError });

        var now = DateTime.UtcNow;

        var task = new UserTask
        {
            UserId = userId,
            GoalId = dto.GoalId,
            MilestoneId = dto.MilestoneId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            DueDate = dto.DueDate,
            Priority = dto.Priority,
            Status = "pending",
            IsRecurring = dto.IsRecurring,
            RecurrenceRule = dto.IsRecurring ? dto.RecurrenceRule?.Trim() : null,
            CreatedAt = now,
            UpdatedAt = now
        };

        await using var transaction = await _context.Database.BeginTransactionAsync();

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        if (task.IsRecurring)
            await _recurrence.GenerateOccurrencesAsync(task.Id);

        await RecalculateGoal(task.GoalId, userId);

        await transaction.CommitAsync();

        await LoadRelations(task);

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, MapToDto(task));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateTask(long id, [FromBody] UpdateUserTaskDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var task = await _context.Tasks.Include(t => t.Goal).Include(t => t.Milestone).FirstOrDefaultAsync(t => t.Id == id &&
                     t.UserId == userId);

        if (task == null)
        {
            return NotFound(new { message = "Завдання не знайдено." });
        }

        var validation = ValidateTask(dto.Title, dto.Priority, dto.IsRecurring, dto.RecurrenceRule);

        if (validation != null)
            return BadRequest(new { message = validation });

        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest(new { message = "Некоректний статус завдання." });
        }

        var relationError = await ValidateRelations(dto.GoalId, dto.MilestoneId, userId);

        if (relationError != null)
            return BadRequest(new { message = relationError });

        var dateError = await _dateValidation.ValidateTaskAsync(dto.GoalId, dto.MilestoneId, dto.StartDate, dto.EndDate, dto.DueDate, dto.IsRecurring, existingTask: task);

        if (dateError != null)
            return BadRequest(new { message = dateError });

        if (task.IsRecurring &&
            (task.StartDate != dto.StartDate ||
             task.EndDate != dto.EndDate ||
             task.RecurrenceRule != dto.RecurrenceRule ||
             !dto.IsRecurring))
        {
            return BadRequest(new { message = "Не можна змінювати дати або правило " + "повторення існуючого завдання. " + "Створіть нове завдання." });
        }

        if (task.IsRecurring && dto.Status != task.Status)
        {
            return BadRequest(new { message = "Статус повторюваного завдання " + "визначається автоматично." });
        }

        if (!task.IsRecurring &&
            dto.IsRecurring &&
            task.Status == "completed")
        {
            return BadRequest(new { message = "Завершене одноразове завдання " + "не можна перетворити на повторюване." });
        }

        bool becameRecurring =
            !task.IsRecurring && dto.IsRecurring;

        if (becameRecurring && dto.Status != "pending")
        {
            return BadRequest(new { message = "Перед увімкненням повторення " + "завдання повинно мати статус pending." });
        }

        long? oldGoalId = task.GoalId;

        bool newlyCompleted =
            !task.IsRecurring &&
            !dto.IsRecurring &&
            task.Status != "completed" &&
            dto.Status == "completed";

        task.GoalId = dto.GoalId;
        task.MilestoneId = dto.MilestoneId;
        task.Title = dto.Title.Trim();
        task.Description = dto.Description?.Trim();
        task.StartDate = dto.StartDate;
        task.EndDate = dto.EndDate;
        task.DueDate = dto.DueDate;
        task.Priority = dto.Priority;
        task.Status = dto.Status;
        task.IsRecurring = dto.IsRecurring;
        task.RecurrenceRule = dto.IsRecurring ? dto.RecurrenceRule?.Trim() : null;

        task.CompletedAt = dto.Status == "completed" ? task.CompletedAt ?? DateTime.UtcNow : null;

        task.UpdatedAt = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.SaveChangesAsync();

        if (becameRecurring)
            await _recurrence.GenerateOccurrencesAsync(task.Id);

        if (oldGoalId != dto.GoalId)
            await RecalculateGoal(oldGoalId, userId);

        await RecalculateGoal(dto.GoalId, userId);

        await transaction.CommitAsync();

        if (newlyCompleted)
        {
            await _gamification.AwardXpOnceAsync(userId, 5, $"Виконання завдання #{task.Id}");
        }

        await LoadRelations(task);

        return Ok(new
        {
            message = "Завдання успішно оновлено.",
            task = MapToDto(task)
        });
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateTaskStatus(long id, [FromBody] UpdateTaskStatusDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest(new { message = "Некоректний статус завдання." });
        }

        var task = await _context.Tasks.Include(t => t.Goal).Include(t => t.Milestone).FirstOrDefaultAsync(t => t.Id == id &&
                     t.UserId == userId);

        if (task == null)
        {
            return NotFound(new { message = "Завдання не знайдено." });
        }

        if (task.IsRecurring)
        {
            return BadRequest(new { message = "Повторюване завдання не можна " + "завершити вручну. " + "Позначайте виконання за конкретні дати." });
        }

        bool newlyCompleted =
            task.Status != "completed" &&
            dto.Status == "completed";

        task.Status = dto.Status;

        task.CompletedAt = dto.Status == "completed" ? task.CompletedAt ?? DateTime.UtcNow : null;

        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await RecalculateGoal(task.GoalId, userId);

        if (newlyCompleted)
        {
            await _gamification.AwardXpOnceAsync(userId, 5, $"Виконання завдання #{task.Id}");
        }

        return Ok(new
        {
            message = "Статус завдання змінено.",
            task = MapToDto(task)
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteTask(long id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id &&
                     t.UserId == userId);

        if (task == null)
        {
            return NotFound(new { message = "Завдання не знайдено." });
        }

        long? goalId = task.GoalId;

        _context.Tasks.Remove(task);

        await _context.SaveChangesAsync();

        await RecalculateGoal(goalId, userId);

        return Ok(new { message = "Завдання успішно видалено." });
    }
}
