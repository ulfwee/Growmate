using System.Security.Claims;
using backend.Data;
using backend.DTOs.ClubRating;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/rating")]
public class ClubRatingController : ControllerBase
{
    private readonly AppDBContext _db;

    public ClubRatingController(AppDBContext db)
    {
        _db = db;
    }

    #region Methods

    private long? CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(value, out var id) ? id : null;
        }
    }

    #endregion

    [HttpGet]
    public async Task<ActionResult<ClubRatingDto>> GetRating(long clubId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        var club = await _db.Clubs.AsNoTracking().Where(c => c.Id == clubId).Select(c => new
        {
            c.Id,
            c.OwnerId,
            c.Visibility
        }).FirstOrDefaultAsync();

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        var isMember = await _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");

        if (club.OwnerId != userId && !isMember)
            return StatusCode(403, new { message = "Рейтинг доступний лише учасникам клубу." });

        var members = await _db.ClubMembers.AsNoTracking().Where(m => m.ClubId == clubId && m.Status == "active").Select(m => new
        {
            m.UserId,
            m.User.Username,
            m.User.Profile.FirstName,
            m.User.Profile.LastName,
            m.User.Profile.AvatarUrl
        }).ToListAsync();

        var points = await _db.ClubPointTransactions.AsNoTracking().Where(p => p.ClubId == clubId).GroupBy(p => p.UserId).Select(g => new
        {
            UserId = g.Key,
            TotalPoints = g.Sum(p => p.Points),
            CompletedTasks = g.Count(p => p.ActionType == "group_task"),
            ReportsCount = g.Count(p => p.ActionType == "report"),
            EventsCount = g.Count(p => p.ActionType == "event")
        }).ToDictionaryAsync(p => p.UserId);

        var rating = members.Select(m =>
        {
            points.TryGetValue(m.UserId, out var stats);

            return new ClubRatingMemberDto
            {
                UserId = m.UserId,
                Username = m.Username,
                FirstName = m.FirstName,
                LastName = m.LastName,
                AvatarUrl = m.AvatarUrl,
                TotalPoints = stats?.TotalPoints ?? 0,
                CompletedTasks = stats?.CompletedTasks ?? 0,
                ReportsCount = stats?.ReportsCount ?? 0,
                EventsCount = stats?.EventsCount ?? 0,
                IsCurrentUser = m.UserId == userId
            };
        }).OrderByDescending(m => m.TotalPoints).ThenBy(m => m.Username).ToList();

        for (var i = 0; i < rating.Count; i++)
            rating[i].Position = i + 1;

        return Ok(new ClubRatingDto
        {
            ClubId = clubId,
            MembersCount = rating.Count,
            Members = rating
        });
    }
}
