using System.Data;
using System.Security.Claims;
using backend.Data;
using backend.DTOs.Events;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/events")]
public class ClubEventsController : ControllerBase
{
    private readonly AppDBContext _db;
    private readonly ClubRatingService _rating;
    private readonly GamificationService _gamification;
    private readonly NotificationDispatcher _notifications;
    public ClubEventsController(AppDBContext db, ClubRatingService rating, GamificationService gamification, NotificationDispatcher notifications)
    {
        _db = db;
        _rating = rating;
        _gamification = gamification;
        _notifications = notifications;
    }

    #region Methods

    private long? CurrentUserId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private Task<bool> IsMember(long clubId, long userId) =>
        _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");

    private async Task<bool> CanManage(long clubId, long userId)
    {
        bool isOwner = await _db.Clubs.AnyAsync(c => c.Id == clubId && c.OwnerId == userId);

        if (isOwner) return true;

        return await _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active" && (m.Role == "owner" || m.Role == "moderator"));
    }

    private async Task<bool> CanView(long clubId, long userId)
    {
        bool isPublicOrOwner = await _db.Clubs.AnyAsync(c => c.Id == clubId && (c.Visibility == "public" || c.OwnerId == userId));

        if (isPublicOrOwner) return true;

        return await IsMember(clubId, userId);
    }

    private async Task<ClubEventDto> ToDto(ClubEvent e, long userId)
    {
        bool member = await IsMember(e.ClubId, userId);

        return new ClubEventDto
        {
            Id = e.Id,
            ClubId = e.ClubId,
            ClubName = e.Club.Name,
            Title = e.Title,
            Description = e.Description,
            CoverUrl = e.CoverUrl,
            EventType = e.EventType,
            Location = e.Location,
            MeetingUrl = member ? e.MeetingUrl : null,
            StartsAt = e.StartsAt,
            EndsAt = e.EndsAt,
            MaxParticipants = e.MaxParticipants,
            CreatedAt = e.CreatedAt,

            ParticipantsCount = await _db.ClubEventParticipants.CountAsync(p => p.EventId == e.Id),

            IsClubMember = member,

            IsParticipant = await _db.ClubEventParticipants.AnyAsync(p => p.EventId == e.Id && p.UserId == userId),

            CanManage = await CanManage(e.ClubId, userId)
        };
    }

    private static string? Validate(SaveClubEventDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return "Вкажіть назву події.";

        if (dto.EventType != "online" && dto.EventType != "offline")
            return "Невідомий формат події.";

        if (dto.StartsAt == default)
            return "Вкажіть дату початку.";

        if (dto.EndsAt.HasValue && dto.EndsAt.Value <= dto.StartsAt)
            return "Дата завершення має бути пізніше початку.";

        if (dto.MaxParticipants.HasValue && dto.MaxParticipants.Value < 1)
            return "Кількість місць має бути додатною.";

        return null;
    }

    private static DateTime NormalizeUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private static void Apply(ClubEvent e, SaveClubEventDto dto)
    {
        e.Title = dto.Title.Trim();
        e.Description = dto.Description?.Trim();
        e.CoverUrl = dto.CoverUrl?.Trim();
        e.EventType = dto.EventType;
        e.Location = dto.Location?.Trim();
        e.MeetingUrl = dto.MeetingUrl?.Trim();
        e.StartsAt = NormalizeUtc(dto.StartsAt);
        e.EndsAt = dto.EndsAt.HasValue ? NormalizeUtc(dto.EndsAt.Value) : null;
        e.MaxParticipants = dto.MaxParticipants;
        e.UpdatedAt = DateTime.UtcNow;
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetAll(long clubId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await CanView(clubId, userId))
            return NotFound();

        var events = await _db.ClubEvents.Include(e => e.Club).Where(e => e.ClubId == clubId).OrderBy(e => e.StartsAt).ToListAsync();

        var result = new List<ClubEventDto>();

        foreach (var e in events)
            result.Add(await ToDto(e, userId));

        return Ok(result);
    }

    [HttpGet("{eventId:long}")]
    public async Task<IActionResult> GetById(long clubId, long eventId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await CanView(clubId, userId))
            return NotFound();

        var e = await _db.ClubEvents.Include(x => x.Club).FirstOrDefaultAsync(x => x.Id == eventId && x.ClubId == clubId);

        if (e == null)
            return NotFound();

        return Ok(await ToDto(e, userId));
    }


    [HttpPost]
    public async Task<IActionResult> Create(long clubId, [FromBody] SaveClubEventDto dto)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await CanManage(clubId, userId))
            return Forbid();

        var error = Validate(dto);
        if (error != null)
            return BadRequest(new { message = error });

        if (NormalizeUtc(dto.StartsAt) <= DateTime.UtcNow)
            return BadRequest(new { message = "Подія повинна починатися в майбутньому." });

        var e = new ClubEvent
        {
            ClubId = clubId,
            CreatedBy = userId
        };

        Apply(e, dto);

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        _db.ClubEvents.Add(e);
        await _db.SaveChangesAsync();

        if (dto.PublishAnnouncement)
        {
            _db.ClubAnnouncements.Add(new ClubAnnouncement
            {
                ClubId = clubId,
                AuthorId = userId,
                Title = e.Title,
                Content = e.Description ??
                    "Запрошуємо на нову подію клубу!",
                AnnouncementType = "event",
                ImageUrl = e.CoverUrl,
                RelatedEventId = e.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
        }

        await transaction.CommitAsync();

        await _notifications.ToClubAsync(
            clubId,
            "new_event",
            "Нова подія у клубі",
            $"Створено подію «{e.Title}». Переглянь деталі та долучайся!",
            $"/clubs/{clubId}",
            excludeUserId: userId
        );

        await _db.Entry(e).Reference(x => x.Club).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { clubId, eventId = e.Id }, await ToDto(e, userId));
    }

    [HttpPut("{eventId:long}")]
    public async Task<IActionResult> Update(long clubId, long eventId, [FromBody] SaveClubEventDto dto)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await CanManage(clubId, userId))
            return Forbid();

        var e = await _db.ClubEvents.Include(x => x.Club).FirstOrDefaultAsync(x => x.Id == eventId && x.ClubId == clubId);

        if (e == null)
            return NotFound();

        var error = Validate(dto);
        if (error != null)
            return BadRequest(new { message = error });

        var count = await _db.ClubEventParticipants.CountAsync(p => p.EventId == eventId);

        if (dto.MaxParticipants.HasValue && count > dto.MaxParticipants.Value)
            return BadRequest(new { message = "Місць менше, ніж зареєстрованих учасників." });

        Apply(e, dto);
        await _db.SaveChangesAsync();

        return Ok(await ToDto(e, userId));
    }

    [HttpDelete("{eventId:long}")]
    public async Task<IActionResult> Delete(long clubId, long eventId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await CanManage(clubId, userId))
            return Forbid();

        var e = await _db.ClubEvents.FirstOrDefaultAsync(x => x.Id == eventId && x.ClubId == clubId);

        if (e == null)
            return NotFound();

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        var announcements = await _db.ClubAnnouncements.Where(a => a.RelatedEventId == eventId).ToListAsync();

        foreach (var announcement in announcements)
            announcement.RelatedEventId = null;

        _db.ClubEvents.Remove(e);
        await _db.SaveChangesAsync();

        await _db.ClubPointTransactions.Where(p => p.ClubId == clubId && p.ActionType == "event" && p.SourceId == eventId).ExecuteDeleteAsync();

        await transaction.CommitAsync();

        return NoContent();
    }

    [HttpPost("{eventId:long}/join")]
    public async Task<IActionResult> Join(long clubId, long eventId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        if (!await IsMember(clubId, userId))
            return BadRequest(new { message = "Спочатку приєднайтеся до клубу." });

        await using var transaction =
            await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var e = await _db.ClubEvents.FirstOrDefaultAsync(x => x.Id == eventId && x.ClubId == clubId);

        if (e == null)
            return NotFound();

        if (e.StartsAt <= DateTime.UtcNow)
            return BadRequest(new { message = "Реєстрацію на подію завершено." });

        bool alreadyJoined = await _db.ClubEventParticipants.AnyAsync(p => p.EventId == eventId && p.UserId == userId);

        if (alreadyJoined)
            return Ok(new { message = "Ви вже зареєстровані на подію." });

        int count = await _db.ClubEventParticipants.CountAsync(p => p.EventId == eventId);

        if (e.MaxParticipants.HasValue && count >= e.MaxParticipants.Value)
            return Conflict(new { message = "Усі місця вже зайняті." });

        _db.ClubEventParticipants.Add(
            new ClubEventParticipant
            {
                EventId = eventId,
                UserId = userId
            });

        try
        {
            await _db.SaveChangesAsync();

            await _rating.AwardEventAsync(clubId, userId, eventId);

            await _gamification.AwardXpOnceAsync(
    userId,
    5,
    $"event_join:{eventId}");

            await _gamification.RegisterActivityAsync(userId);
            await transaction.CommitAsync();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();

            return Conflict(new { message = "Не вдалося зареєструватися. Оновіть сторінку." });
        }

        return Ok(new { message = "Ви успішно зареєструвалися на подію." });
    }

    [HttpDelete("{eventId:long}/join")]
    public async Task<IActionResult> Leave(long clubId, long eventId)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        bool exists = await _db.ClubEvents.AnyAsync(e => e.Id == eventId && e.ClubId == clubId);

        if (!exists)
            return NotFound();

        var participant = await _db.ClubEventParticipants.FirstOrDefaultAsync(p => p.EventId == eventId && p.UserId == userId);

        if (participant == null)
            return NoContent();

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        _db.ClubEventParticipants.Remove(participant);

        await _db.SaveChangesAsync();

        await _rating.RemoveEventPointsAsync(clubId, userId, eventId);

        await transaction.CommitAsync();

        return NoContent();
    }

    [HttpGet("~/api/events/featured")]
    public async Task<IActionResult> GetFeatured([FromQuery] int limit = 5)
    {
        if (CurrentUserId is not long userId)
            return Unauthorized();

        limit = Math.Clamp(limit, 1, 5);

        var now = DateTime.UtcNow;

        var events = await _db.ClubEvents.AsNoTracking().Where(e =>
                e.StartsAt > now &&
                (e.Club.Visibility == "public" || e.Club.OwnerId == userId || _db.ClubMembers.Any(m => m.ClubId == e.ClubId && m.UserId == userId && m.Status == "active"))).OrderByDescending(e => e.CreatedAt).ThenBy(e => e.StartsAt).Take(limit).Select(e => new ClubEventDto
                {
                    Id = e.Id,
                    ClubId = e.ClubId,
                    ClubName = e.Club.Name,
                    Title = e.Title,
                    Description = e.Description,
                    CoverUrl = e.CoverUrl,
                    EventType = e.EventType,
                    Location = e.Location,
                    StartsAt = e.StartsAt,
                    EndsAt = e.EndsAt,
                    MaxParticipants = e.MaxParticipants,
                    CreatedAt = e.CreatedAt,

                    ParticipantsCount = _db.ClubEventParticipants
                    .Count(p => p.EventId == e.Id),

                    IsClubMember =
                    e.Club.OwnerId == userId ||
                    _db.ClubMembers.Any(m => m.ClubId == e.ClubId && m.UserId == userId && m.Status == "active"),

                    IsParticipant = _db.ClubEventParticipants
                    .Any(p => p.EventId == e.Id && p.UserId == userId),

                    CanManage =
                    e.Club.OwnerId == userId ||
                    _db.ClubMembers.Any(m => m.ClubId == e.ClubId && m.UserId == userId && m.Status == "active" && (m.Role == "owner" || m.Role == "moderator"))
                }).ToListAsync();

        return Ok(events);
    }
}
