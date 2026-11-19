using System.Security.Claims;
using backend.Data;
using backend.DTOs.XP;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/xp")]
[Authorize]
public class UserXpController : ControllerBase
{
    private readonly AppDBContext _context;

    public UserXpController(AppDBContext context) => _context = context;

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    #endregion

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var profile = await _context.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound(new { message = "Профіль користувача не знайдено." });

        var levelProgress = GamificationService.GetLevelProgress(profile.TotalXp);
        var achievementsCount = await _context.UserAchievements.CountAsync(ua => ua.UserId == userId);
        var completedGoalsCount = await _context.Goals.CountAsync(g => g.UserId == userId && g.Status == "completed");
        var completedTasksCount = await _context.Tasks.CountAsync(t => t.UserId == userId && t.Status == "completed");
        var actualStreak = GamificationService.GetActualStreak(profile.CurrentStreak, profile.LastActivityDate);
        var isStreakActiveToday = profile.LastActivityDate?.Date == DateTime.UtcNow.Date;

        var stats = new UserXpStatsDto
        {
            TotalXp = profile.TotalXp,
            CurrentStreak = actualStreak,
            LongestStreak = profile.LongestStreak,
            AchievementsCount = achievementsCount,
            CompletedGoalsCount = completedGoalsCount,
            CompletedTasksCount = completedTasksCount,
            Level = levelProgress.Level,
            XpInLevel = levelProgress.XpInLevel,
            XpForNextLevel = levelProgress.XpForNextLevel,
            XpRemaining = levelProgress.XpRemaining,
            LevelProgressPercent = levelProgress.ProgressPercent,
            IsStreakActiveToday = isStreakActiveToday
        };

        return Ok(stats);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetXpHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (page < 1 || pageSize < 1 || pageSize > 100) return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.UserXpHistory.AsNoTracking().Where(x => x.UserId == userId);
        var totalCount = await query.CountAsync();
        var history = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).Select(x => new XpHistoryDto
        {
            Id = x.Id,
            XpAmount = x.XpAmount,
            Reason = x.Reason,
            CreatedAt = x.CreatedAt
        }).ToListAsync();

        return Ok(new
        {
            Items = history,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }
}
