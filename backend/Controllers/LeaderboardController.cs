using System.Security.Claims;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/leaderboard")]
public class LeaderboardController : ControllerBase
{
    private readonly AppDBContext _context;

    public LeaderboardController(AppDBContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetLeaderboard(CancellationToken cancellationToken)
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(idValue, out var currentUserId)) return Unauthorized();

        var users = await _context.UserProfiles.AsNoTracking().Select(p => new
        {
            Id = p.UserId,
            p.User.Username,
            p.FirstName,
            p.LastName,
            p.AvatarUrl,
            p.TotalXp
        }).OrderByDescending(p => p.TotalXp).ThenBy(p => p.Id).ToListAsync(cancellationToken);

        var ranked = users.Select((p, index) => new
        {
            Rank = index + 1,
            p.Id,
            p.Username,
            DisplayName = string.IsNullOrWhiteSpace(p.FirstName) ? p.Username : (p.FirstName + " " + (p.LastName ?? "")).Trim(),
            p.AvatarUrl,
            p.TotalXp,
            IsCurrentUser = p.Id == currentUserId
        }).ToList();

        return Ok(new
        {
            TotalUsers = ranked.Count,
            TopThree = ranked.Take(3).ToList(),
            OtherUsers = ranked.Skip(3).ToList(),
            CurrentUser = ranked.FirstOrDefault(p => p.Id == currentUserId)
        });
    }
}
