using System.Security.Claims;
using backend.Data;
using backend.DTOs.GoalMilestones;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/goals/{goalId:long}/milestones")]
[Authorize]
public class MilestonesController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly GoalProgressService _progress;
    private readonly GamificationService _gamification;

    public MilestonesController(AppDBContext context, GoalProgressService progress, GamificationService gamification)
    {
        _context = context;
        _progress = progress;
        _gamification = gamification;
    }

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static MilestoneDto MapToDto(GoalMilestone milestone)
    {
        return new MilestoneDto
        {
            Id = milestone.Id,
            GoalId = milestone.GoalId,
            Title = milestone.Title,
            Description = milestone.Description,
            DueDate = milestone.DueDate,
            Progress = milestone.Progress,
            IsCompleted = milestone.IsCompleted,
            CompletedAt = milestone.CompletedAt,
            CreatedAt = milestone.CreatedAt
        };
    }

    private async Task<Goal?> GetOwnedGoal(long goalId, long userId) => await _context.Goals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetMilestones(long goalId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var goal = await GetOwnedGoal(goalId, userId);
        if (goal == null) return NotFound(new { message = "Ціль не знайдено." });

        var milestones = await _context.GoalMilestones.AsNoTracking().Where(m => m.GoalId == goalId).OrderBy(m => m.CreatedAt).ToListAsync();
        return Ok(milestones.Select(MapToDto));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMilestone(long goalId, long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (await GetOwnedGoal(goalId, userId) == null) return NotFound(new { message = "Ціль не знайдено." });

        var milestone = await _context.GoalMilestones.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id && m.GoalId == goalId);
        if (milestone == null) return NotFound(new { message = "Етап не знайдено." });
        return Ok(MapToDto(milestone));
    }

    [HttpPost]
    public async Task<IActionResult> CreateMilestone(long goalId, [FromBody] CreateMilestoneDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (await GetOwnedGoal(goalId, userId) == null) return NotFound(new { message = "Ціль не знайдено." });
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Назва етапу обов'язкова." });

        var milestone = new GoalMilestone
        {
            GoalId = goalId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            DueDate = dto.DueDate,
            Progress = 0,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.GoalMilestones.Add(milestone);
        await _context.SaveChangesAsync();
        await _progress.RecalculateWithRewardsAsync(goalId, userId);
        return CreatedAtAction(nameof(GetMilestone), new { goalId, id = milestone.Id }, MapToDto(milestone));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateMilestone(long goalId, long id, [FromBody] UpdateMilestoneDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (await GetOwnedGoal(goalId, userId) == null) return NotFound(new { message = "Ціль не знайдено." });

        var milestone = await _context.GoalMilestones.FirstOrDefaultAsync(m => m.Id == id && m.GoalId == goalId);
        if (milestone == null) return NotFound(new { message = "Етап не знайдено." });
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Назва етапу обов'язкова." });

        milestone.Title = dto.Title.Trim();
        milestone.Description = dto.Description?.Trim();
        milestone.DueDate = dto.DueDate;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Етап успішно оновлено.", milestone = MapToDto(milestone) });
    }

    [HttpPatch("{id:long}/completion")]
    public async Task<IActionResult> UpdateMilestoneCompletion(long goalId, long id, [FromBody] bool isCompleted)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (await GetOwnedGoal(goalId, userId) == null) return NotFound(new { message = "Ціль не знайдено." });

        var milestone = await _context.GoalMilestones.FirstOrDefaultAsync(m => m.Id == id && m.GoalId == goalId);
        if (milestone == null) return NotFound(new { message = "Етап не знайдено." });

        bool hasTasks = await _context.Tasks.AnyAsync(t => t.MilestoneId == id);
        if (hasTasks) return BadRequest(new { message = "Цей етап має завдання. " + "Його прогрес визначається автоматично." });

        bool newlyCompleted = !milestone.IsCompleted && isCompleted;
        milestone.IsCompleted = isCompleted;
        milestone.Progress = isCompleted ? 100 : 0;
        milestone.CompletedAt = isCompleted ? milestone.CompletedAt ?? DateTime.UtcNow : null;

        await _context.SaveChangesAsync();
        await _progress.RecalculateWithRewardsAsync(goalId, userId);
        if (newlyCompleted) await _gamification.AwardXpOnceAsync(userId, 30, $"Завершення етапу #{milestone.Id}");

        var goal = await _context.Goals.AsNoTracking().FirstAsync(g => g.Id == goalId);
        return Ok(new
        {
            message = isCompleted ? "Етап завершено." : "Етап знову активний.",
            milestone = MapToDto(milestone),
            goalProgress = goal.Progress
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteMilestone(long goalId, long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (await GetOwnedGoal(goalId, userId) == null) return NotFound(new { message = "Ціль не знайдено." });

        var milestone = await _context.GoalMilestones.FirstOrDefaultAsync(m => m.Id == id && m.GoalId == goalId);
        if (milestone == null) return NotFound(new { message = "Етап не знайдено." });

        var tasks = await _context.Tasks.Where(t => t.MilestoneId == id).ToListAsync();
        foreach (var task in tasks)
        {
            task.MilestoneId = null;
            task.UpdatedAt = DateTime.UtcNow;
        }

        _context.GoalMilestones.Remove(milestone);
        await _context.SaveChangesAsync();
        await _progress.RecalculateWithRewardsAsync(goalId, userId);
        return Ok(new { message = "Етап видалено. Його завдання залишилися в основній цілі." });
    }
}
