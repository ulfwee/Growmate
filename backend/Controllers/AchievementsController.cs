using System.Security.Claims;
using backend.Data;
using backend.DTOs.Achievements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/achievements")]
[Authorize]
public class AchievementsController : ControllerBase
{
    private readonly AppDBContext _context;

    public AchievementsController(AppDBContext context)
    {
        _context = context;
    }

    private bool TryGetUserId(out long userId)
    {
        return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }

    [HttpGet]
    public async Task<IActionResult> GetAchievements()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var achievements = await _context.Achievements.AsNoTracking().OrderBy(a => a.Id)
            .Select(a => new AchievementDto
            {
                Id = a.Id,
                Name = a.Name,
                Description = a.Description,
                IconUrl = a.IconUrl,
                XpReward = a.XpReward,
                IsEarned = a.UserAchievements.Any(ua => ua.UserId == userId),
                EarnedAt = a.UserAchievements.Where(ua => ua.UserId == userId).Select(ua => (DateTime?)ua.EarnedAt).FirstOrDefault()
            }).ToListAsync();

        return Ok(achievements);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyAchievements()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var achievements = await _context.UserAchievements.AsNoTracking().Where(ua => ua.UserId == userId).OrderByDescending(ua => ua.EarnedAt)
            .Select(ua => new AchievementDto
            {
                Id = ua.Achievement.Id,
                Name = ua.Achievement.Name,
                Description = ua.Achievement.Description,
                IconUrl = ua.Achievement.IconUrl,
                XpReward = ua.Achievement.XpReward,
                IsEarned = true,
                EarnedAt = ua.EarnedAt
            }).ToListAsync();

        return Ok(achievements);
    }
}