using System.Security.Claims;
using backend.Data;
using backend.DTOs.Goals;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly GamificationService _gamificationService;
    private readonly GoalProgressService _goalProgressService;

    public GoalsController(AppDBContext context, GamificationService gamificationService, GoalProgressService goalProgressService)
    {
        _context = context;
        _gamificationService = gamificationService;
        _goalProgressService = goalProgressService;
    }

    #region Methods

    private bool TryGetUserId(out long userId)
    {
        return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }

    private static readonly string[] AllowedStatuses =
    {
        "planned", "active", "completed", "cancelled"
    };

    private static GoalDto MapToDto(Goal goal)
    {
        return new GoalDto
        {
            Id = goal.Id,
            Title = goal.Title,
            Description = goal.Description,
            StartDate = goal.StartDate,
            Deadline = goal.Deadline,
            Status = goal.Status,
            Progress = goal.Progress,
            CreatedAt = goal.CreatedAt,
            UpdatedAt = goal.UpdatedAt
        };
    }

    private async Task<bool> HasProgressItems(long goalId)
    {
        bool hasMilestones = await _context.GoalMilestones.AnyAsync(m => m.GoalId == goalId);

        if (hasMilestones)
            return true;

        return await _context.Tasks.AnyAsync(t => t.GoalId == goalId);
    }

    private static string? ValidateGoal(string? title, DateOnly startDate, DateOnly? deadline)
    {
        if (string.IsNullOrWhiteSpace(title))
            return "Назва цілі не може бути порожньою.";

        if (title.Trim().Length > 200)
            return "Назва цілі не може перевищувати 200 символів.";

        if (deadline.HasValue && deadline.Value < startDate)
            return "Кінцева дата не може бути раніше дати початку.";

        return null;
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetGoals()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var goals = await _context.Goals.AsNoTracking().Where(g => g.UserId == userId).OrderByDescending(g => g.CreatedAt).Select(g => new GoalDto
        {
            Id = g.Id,
            Title = g.Title,
            Description = g.Description,
            StartDate = g.StartDate,
            Deadline = g.Deadline,
            Status = g.Status,
            Progress = g.Progress,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt
        }).ToListAsync();

        return Ok(goals);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGoal(long id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var goal = await _context.Goals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

        if (goal == null)
        {
            return NotFound(new { message = "Ціль не знайдено." });
        }

        return Ok(MapToDto(goal));
    }

    [HttpPost]
    public async Task<IActionResult> CreateGoal(
        [FromBody] CreateGoalDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var validationError = ValidateGoal(dto.Title, dto.StartDate, dto.Deadline);

        if (validationError != null)
            return BadRequest(new { message = validationError });

        var now = DateTime.UtcNow;

        var goal = new Goal
        {
            UserId = userId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            StartDate = dto.StartDate,
            Deadline = dto.Deadline,
            Status = "active",
            Progress = 0,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Goals.Add(goal);

        await _context.SaveChangesAsync();
        await _gamificationService.CheckAchievementsAsync(userId);

        return CreatedAtAction(nameof(GetGoal), new { id = goal.Id }, MapToDto(goal));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateGoal(long id,
        [FromBody] UpdateGoalDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var goal = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

        if (goal == null)
        {
            return NotFound(new { message = "Ціль не знайдено." });
        }

        var validationError = ValidateGoal(dto.Title, dto.StartDate, dto.Deadline);

        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest(new { message = "Некоректний статус цілі." });
        }

        bool hasItems = await HasProgressItems(id);
        if (hasItems && dto.Status == "completed")
        {
            return BadRequest(new
            {
                message = "Ціль із завданнями або проміжними " +
                    "етапами завершується автоматично."
            });
        }

        bool newlyCompleted = !hasItems && goal.Status != "completed" && dto.Status == "completed";

        goal.Title = dto.Title.Trim();
        goal.Description = dto.Description?.Trim();
        goal.StartDate = dto.StartDate;
        goal.Deadline = dto.Deadline;

        if (!hasItems)
        {
            goal.Status = dto.Status;

            goal.Progress = dto.Status == "completed" ? 100 : 0;
        }
        else
        {
            if (dto.Status == "cancelled" || dto.Status == "planned")
                goal.Status = dto.Status;
            else if (dto.Status == "active")
                goal.Status = "active";
        }

        goal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        if (hasItems && dto.Status == "active")
            await _goalProgressService.RecalculateWithRewardsAsync(id, userId);

        if (newlyCompleted)
        {
            await _gamificationService.AwardXpOnceAsync(userId, 100, $"Завершення цілі #{goal.Id}");
        }
        var updatedGoal = await _context.Goals.AsNoTracking().FirstAsync(g => g.Id == id);

        return Ok(new
        {
            message = "Ціль успішно оновлено.",
            goal = MapToDto(updatedGoal)
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteGoal(long id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var goal = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

        if (goal == null)
        {
            return NotFound(new { message = "Ціль не знайдено." });
        }

        _context.Goals.Remove(goal);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ціль успішно видалено." });
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> ChangeStatus(long id,
        [FromBody] string status)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var goal = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

        if (goal == null)
        {
            return NotFound(new { message = "Ціль не знайдено." });
        }

        if (!AllowedStatuses.Contains(status))
        {
            return BadRequest(new { message = "Некоректний статус цілі." });
        }

        bool hasItems = await HasProgressItems(id);

        if (hasItems && status == "completed")
        {
            return BadRequest(new
            {
                message = "Ціль із завданнями або проміжними " +
                    "етапами завершиться автоматично " +
                    "після виконання всіх складових."
            });
        }

        bool newlyCompleted = !hasItems && goal.Status != "completed" && status == "completed";

        if (!hasItems)
        {
            goal.Status = status;

            goal.Progress = status == "completed" ? 100 : 0;
        }
        else
        {
            goal.Status = status;
        }

        goal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (hasItems && status == "active")

            await _goalProgressService.RecalculateWithRewardsAsync(id, userId);

        if (newlyCompleted)
        {
            await _gamificationService.AwardXpOnceAsync(userId, 100, $"Завершення цілі #{goal.Id}");
        }

        var updatedGoal = await _context.Goals.AsNoTracking().FirstAsync(g => g.Id == id);

        return Ok(new
        {
            message = "Статус цілі успішно змінено.",
            goal = MapToDto(updatedGoal)
        });
    }
}
