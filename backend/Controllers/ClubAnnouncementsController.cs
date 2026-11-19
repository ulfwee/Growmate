using System.Security.Claims;
using backend.Data;
using backend.DTOs.Announcements;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/announcements")]
public class ClubAnnouncementsController : ControllerBase
{
    private readonly AppDBContext _db;
    private readonly NotificationDispatcher _notifications;
    private static readonly string[] AllowedTypes = { "general", "event", "group_goal" };

    public ClubAnnouncementsController(AppDBContext db, NotificationDispatcher notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    #region Methods
    private long? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : null;
    }

    private async Task<ClubAccess?> GetClubAccess(long clubId, long userId)
    {
        var club = await _db.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId);
        if (club == null)
            return null;

        var membership = await _db.ClubMembers.AsNoTracking().FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");
        var isOwner = club.OwnerId == userId;
        var isMember = membership != null || isOwner;
        var canManage = isOwner || membership?.Role is "moderator" or "admin";

        return new ClubAccess(club.Visibility, isMember, isOwner, canManage);
    }

    private IActionResult? CheckReadAccess(ClubAccess? access)
    {
        if (access == null)
            return NotFound("Клуб не знайдено.");

        if (access.Visibility == "private" && !access.IsMember)
            return StatusCode(403, "Ви не маєте доступу до цього клубу. Подайте заявку.");

        return null;
    }

    private async Task<AnnouncementDto?> GetAnnouncementDto(long clubId, long announcementId, long userId, ClubAccess access)
    {
        var data = await (
            from a in _db.ClubAnnouncements.AsNoTracking()
            join u in _db.Users.AsNoTracking() on a.AuthorId equals u.Id
            join profile in _db.UserProfiles.AsNoTracking() on u.Id equals profile.UserId into profiles
            from profile in profiles.DefaultIfEmpty()
            where a.Id == announcementId && a.ClubId == clubId
            select new
            {
                a.Id,
                a.ClubId,
                a.AuthorId,
                u.Username,
                FirstName = profile == null ? null : profile.FirstName,
                LastName = profile == null ? null : profile.LastName,
                AvatarUrl = profile == null ? null : profile.AvatarUrl,
                a.Title,
                a.Content,
                a.AnnouncementType,
                a.ImageUrl,
                a.RelatedEventId,
                a.RelatedGroupGoalId,
                a.IsPinned,
                a.CreatedAt,
                a.UpdatedAt,
                LikesCount = _db.ClubAnnouncementLikes.Count(l => l.AnnouncementId == a.Id),
                IsLiked = _db.ClubAnnouncementLikes.Any(l => l.AnnouncementId == a.Id && l.UserId == userId)
            }
        ).FirstOrDefaultAsync();

        if (data == null)
            return null;

        var fullName = string.Join(" ", new[] { data.FirstName, data.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));

        return new AnnouncementDto
        {
            Id = data.Id,
            ClubId = data.ClubId,
            AuthorId = data.AuthorId,
            AuthorName = string.IsNullOrWhiteSpace(fullName) ? data.Username : fullName,
            AuthorAvatarUrl = data.AvatarUrl,
            Title = data.Title,
            Content = data.Content,
            AnnouncementType = data.AnnouncementType,
            ImageUrl = data.ImageUrl,
            RelatedEventId = data.RelatedEventId,
            RelatedGroupGoalId = data.RelatedGroupGoalId,
            IsPinned = data.IsPinned,
            LikesCount = data.LikesCount,
            IsLiked = data.IsLiked,
            CanEdit = access.IsOwner || (access.CanManage && data.AuthorId == userId),
            CanDelete = access.IsOwner || (access.CanManage && data.AuthorId == userId),
            CanPin = access.CanManage,
            CreatedAt = data.CreatedAt,
            UpdatedAt = data.UpdatedAt
        };
    }

    private static bool CanModify(ClubAnnouncement announcement, long userId, ClubAccess access)
    {
        return access.IsOwner || (access.CanManage && announcement.AuthorId == userId);
    }

    private async Task<IActionResult?> ValidateInput(long clubId, SaveAnnouncementDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest("Назва та текст оголошення обов'язкові.");

        if (dto.Title.Trim().Length > 200)
            return BadRequest("Назва надто довга.");

        if (!AllowedTypes.Contains(dto.AnnouncementType))
            return BadRequest("Невідомий тип оголошення.");

        if (dto.AnnouncementType == "group_goal")
        {
            if (!dto.RelatedGroupGoalId.HasValue)
                return BadRequest("Оберіть групову ціль.");

            var exists = await _db.GroupGoals.AnyAsync(g => g.Id == dto.RelatedGroupGoalId.Value && g.ClubId == clubId);
            if (!exists)
                return BadRequest("Групову ціль не знайдено в цьому клубі.");
        }
        else if (dto.RelatedGroupGoalId.HasValue)
        {
            return BadRequest("Посилання на групову ціль дозволене лише для відповідного типу оголошення.");
        }

        if (dto.AnnouncementType == "event" || dto.RelatedEventId.HasValue)
            return BadRequest("Оголошення про події стануть доступними після створення модуля подій.");

        return null;
    }

    private sealed record ClubAccess(string Visibility, bool IsMember, bool IsOwner, bool CanManage);

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetAll(long clubId)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        var denied = CheckReadAccess(access);
        if (denied != null)
            return denied;

        var ids = await _db.ClubAnnouncements.AsNoTracking().Where(a => a.ClubId == clubId)
            .OrderByDescending(a => a.IsPinned).ThenByDescending(a => a.CreatedAt).Select(a => a.Id).ToListAsync();

        var result = new List<AnnouncementDto>();
        foreach (var id in ids)
        {
            var dto = await GetAnnouncementDto(clubId, id, userId.Value, access!);
            if (dto != null)
                result.Add(dto);
        }

        return Ok(result);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long clubId, long id)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        var denied = CheckReadAccess(access);
        if (denied != null)
            return denied;

        var announcement = await GetAnnouncementDto(clubId, id, userId.Value, access!);
        return announcement == null ? NotFound("Оголошення не знайдено.") : Ok(announcement);
    }

    [HttpPost]
    public async Task<IActionResult> Create(long clubId, [FromBody] SaveAnnouncementDto dto)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        if (!access.CanManage)
            return Forbid();

        var validation = await ValidateInput(clubId, dto);
        if (validation != null)
            return validation;

        var announcement = new ClubAnnouncement
        {
            ClubId = clubId,
            AuthorId = userId.Value,
            Title = dto.Title.Trim(),
            Content = dto.Content.Trim(),
            AnnouncementType = dto.AnnouncementType,
            ImageUrl = dto.ImageUrl,
            RelatedEventId = dto.RelatedEventId,
            RelatedGroupGoalId = dto.RelatedGroupGoalId,
            IsPinned = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ClubAnnouncements.Add(announcement);
        await _db.SaveChangesAsync();

        var authorName = await _db.Users.Where(u => u.Id == userId.Value).Select(u => u.Username).FirstAsync();
        bool isRelatedAnnouncement = announcement.AnnouncementType == "group_goal" && announcement.RelatedGroupGoalId.HasValue;

        if (!isRelatedAnnouncement)
        {
            await _notifications.ToClubAsync(clubId, "new_announcement", "Нове оголошення у клубі",
                $"Опубліковано оголошення «{announcement.Title}».", $"/clubs/{clubId}", excludeUserId: userId.Value);
        }

        var result = await GetAnnouncementDto(clubId, announcement.Id, userId.Value, access);
        return CreatedAtAction(nameof(GetById), new { clubId, id = announcement.Id }, result);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long clubId, long id, [FromBody] SaveAnnouncementDto dto)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        var announcement = await _db.ClubAnnouncements.FirstOrDefaultAsync(a => a.Id == id && a.ClubId == clubId);
        if (announcement == null)
            return NotFound("Оголошення не знайдено.");

        if (!CanModify(announcement, userId.Value, access))
            return Forbid();

        var validation = await ValidateInput(clubId, dto);
        if (validation != null)
            return validation;

        announcement.Title = dto.Title.Trim();
        announcement.Content = dto.Content.Trim();
        announcement.AnnouncementType = dto.AnnouncementType;
        announcement.ImageUrl = dto.ImageUrl;
        announcement.RelatedEventId = dto.RelatedEventId;
        announcement.RelatedGroupGoalId = dto.RelatedGroupGoalId;
        announcement.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await GetAnnouncementDto(clubId, id, userId.Value, access));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long clubId, long id)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        var announcement = await _db.ClubAnnouncements.FirstOrDefaultAsync(a => a.Id == id && a.ClubId == clubId);
        if (announcement == null)
            return NotFound("Оголошення не знайдено.");

        if (!CanModify(announcement, userId.Value, access))
            return Forbid();

        _db.ClubAnnouncements.Remove(announcement);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:long}/pin")]
    public async Task<IActionResult> SetPin(long clubId, long id, [FromBody] SetAnnouncementPinDto dto)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        if (!access.CanManage)
            return Forbid();

        var announcement = await _db.ClubAnnouncements.FirstOrDefaultAsync(a => a.Id == id && a.ClubId == clubId);
        if (announcement == null)
            return NotFound("Оголошення не знайдено.");

        if (dto.IsPinned)
        {
            var pinned = await _db.ClubAnnouncements.Where(a => a.ClubId == clubId && a.IsPinned && a.Id != id).ToListAsync();
            foreach (var item in pinned)
            {
                item.IsPinned = false;
                item.UpdatedAt = DateTime.UtcNow;
            }
        }

        announcement.IsPinned = dto.IsPinned;
        announcement.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await GetAnnouncementDto(clubId, id, userId.Value, access));
    }

    [HttpPost("{id:long}/like")]
    public async Task<IActionResult> Like(long clubId, long id)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        if (!access.IsMember)
            return Forbid();

        var exists = await _db.ClubAnnouncements.AnyAsync(a => a.Id == id && a.ClubId == clubId);
        if (!exists)
            return NotFound("Оголошення не знайдено.");

        var liked = await _db.ClubAnnouncementLikes.AnyAsync(l => l.AnnouncementId == id && l.UserId == userId.Value);
        if (!liked)
        {
            _db.ClubAnnouncementLikes.Add(new ClubAnnouncementLike { AnnouncementId = id, UserId = userId.Value });
            await _db.SaveChangesAsync();
        }

        return Ok(await GetAnnouncementDto(clubId, id, userId.Value, access));
    }

    [HttpDelete("{id:long}/like")]
    public async Task<IActionResult> Unlike(long clubId, long id)
    {
        var userId = CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var access = await GetClubAccess(clubId, userId.Value);
        if (access == null)
            return NotFound("Клуб не знайдено.");

        if (!access.IsMember)
            return Forbid();

        var exists = await _db.ClubAnnouncements.AnyAsync(a => a.Id == id && a.ClubId == clubId);
        if (!exists)
            return NotFound("Оголошення не знайдено.");

        var like = await _db.ClubAnnouncementLikes.FirstOrDefaultAsync(l => l.AnnouncementId == id && l.UserId == userId.Value);
        if (like != null)
        {
            _db.ClubAnnouncementLikes.Remove(like);
            await _db.SaveChangesAsync();
        }

        return Ok(await GetAnnouncementDto(clubId, id, userId.Value, access));
    }
}
