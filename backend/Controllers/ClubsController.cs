using System.Security.Claims;
using backend.Data;
using backend.DTOs.Clubs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClubsController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly ClubRecommendationService _recommendationService;
    private readonly GamificationService _gamification;
    private readonly ClubRatingService _rating;
    private readonly IWebHostEnvironment _environment;
    private readonly NotificationDispatcher _notifications;
    public ClubsController(AppDBContext context, ClubRecommendationService recommendationService, GamificationService gamification, ClubRatingService rating, IWebHostEnvironment environment, NotificationDispatcher notifications)
    {
        _context = context;
        _recommendationService = recommendationService;
        _gamification = gamification;
        _rating = rating;
        _environment = environment;
        _notifications = notifications;
    }
    #region Methods

    private long GetUserId()
    {
        return long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    private async Task<bool> ValidateInterestIdsAsync(List<long> interestIds)
    {
        var ids = interestIds.Distinct().ToList();
        if (!ids.Any()) return true;

        int existingCount = await _context.Interests.CountAsync(i => ids.Contains(i.Id));

        return existingCount == ids.Count;
    }

    private async Task UpdateClubInterestsAsync(long clubId, List<long> interestIds)
    {
        var existingInterests = await _context.ClubInterests.Where(ci => ci.ClubId == clubId).ToListAsync();

        _context.ClubInterests.RemoveRange(existingInterests);

        var newInterests = interestIds.Distinct().Select(interestId => new ClubInterest
        {
            ClubId = clubId,
            InterestId = interestId
        });

        await _context.ClubInterests.AddRangeAsync(newInterests);
    }

    private async Task<bool> CanManageClubAsync(long clubId, long userId)
    {
        return await _context.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active" && (m.Role == "owner" || m.Role == "admin"));
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetClubs([FromQuery] string? search, [FromQuery] long? categoryId)
    {
        var userId = GetUserId();

        var query = _context.Clubs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.Contains(search) || c.Description.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(c => c.CategoryId == categoryId.Value);

        var clubs = await query.OrderByDescending(c => c.CreatedAt).Select(c => new ClubDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            CategoryId = c.CategoryId,
            CategoryName = c.Category.Name,
            OwnerId = c.OwnerId,
            CoverUrl = c.CoverUrl,
            Visibility = c.Visibility,
            Rules = c.Rules,
            MembersCount = c.Members.Count(m => m.Status == "active"),
            IsMember = c.Members.Any(m => m.UserId == userId && m.Status == "active"),
            IsOwner = c.OwnerId == userId,
            CreatedAt = c.CreatedAt,
            MyRole = c.Members.Where(m => m.UserId == userId && m.Status == "active").Select(m => m.Role).FirstOrDefault()
        }).ToListAsync();

        return Ok(clubs);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetClub(long id)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.AsNoTracking().Where(c => c.Id == id).Select(c => new ClubDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            CategoryId = c.CategoryId,
            CategoryName = c.Category.Name,
            OwnerId = c.OwnerId,
            CoverUrl = c.CoverUrl,
            Visibility = c.Visibility,
            Rules = c.Rules,
            MembersCount = c.Members.Count(m => m.Status == "active"),
            IsMember = c.Members.Any(m => m.UserId == userId && m.Status == "active"),
            IsOwner = c.OwnerId == userId,
            CreatedAt = c.CreatedAt,
            MyRole = c.Members.Where(m => m.UserId == userId && m.Status == "active").Select(m => m.Role).FirstOrDefault()
        }).FirstOrDefaultAsync();

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        return Ok(club);
    }

    [HttpGet("recommended")]
    [Authorize]
    public async Task<IActionResult> GetRecommendedClubs()
    {
        long userId = GetUserId();
        var recommendations = await _recommendationService.GetRecommendationsAsync(userId);

        return Ok(recommendations);
    }

    [HttpGet("{id}/interests")]
    [Authorize]
    public async Task<IActionResult> GetClubInterests(long id)
    {
        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        bool isMember = await _context.ClubMembers.AnyAsync(cm => cm.ClubId == id && cm.UserId == userId && cm.Status == "active");

        if (club.Visibility == "private" && club.OwnerId != userId && !isMember)
            return Forbid();

        var interests = await _context.ClubInterests.Where(ci => ci.ClubId == id).Select(ci => new
        {
            ci.Interest.Id,
            ci.Interest.Name,
            ci.Interest.Description
        }).ToListAsync();

        return Ok(interests);
    }

    [HttpPost]
    public async Task<IActionResult> CreateClub([FromBody] CreateClubDto dto)
    {
        var userId = GetUserId();

        if (dto.Visibility != "public" && dto.Visibility != "private")
            return BadRequest(new { message = "Тип видимості має бути public або private." });

        var categoryExists = await _context.ClubCategories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
            return BadRequest(new { message = "Вказано неіснуючу категорію." });

        if (!await ValidateInterestIdsAsync(dto.InterestIds))
            return BadRequest(new { message = "Один або декілька вибраних інтересів не існують." });

        var club = new Club
        {
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            CategoryId = dto.CategoryId,
            OwnerId = userId,
            CoverUrl = dto.CoverUrl,
            Visibility = dto.Visibility,
            Rules = dto.Rules,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            _context.Clubs.Add(club);
            await _context.SaveChangesAsync();

            var ownerMembership = new ClubMember
            {
                ClubId = club.Id,
                UserId = userId,
                Role = "owner",
                Status = "active",
                JoinedAt = DateTime.UtcNow
            };

            _context.ClubMembers.Add(ownerMembership);

            await UpdateClubInterestsAsync(club.Id, dto.InterestIds);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetClub), new { id = club.Id },
                new
                {
                    message = "Клуб успішно створено.",
                    clubId = club.Id
                });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateClub(long id, [FromBody] UpdateClubDto dto)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (!await CanManageClubAsync(id, userId))
            return Forbid();

        if (dto.Visibility != "public" && dto.Visibility != "private")
            return BadRequest(new { message = "Тип видимості має бути public або private." });

        var categoryExists = await _context.ClubCategories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
            return BadRequest(new { message = "Вказано неіснуючу категорію." });

        if (!await ValidateInterestIdsAsync(dto.InterestIds))
            return BadRequest(new { message = "Один або декілька вибраних інтересів не існують." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            club.Name = dto.Name.Trim();
            club.Description = dto.Description.Trim();
            club.CategoryId = dto.CategoryId;
            club.CoverUrl = dto.CoverUrl;
            club.Visibility = dto.Visibility;
            club.Rules = dto.Rules;
            club.UpdatedAt = DateTime.UtcNow;

            await UpdateClubInterestsAsync(club.Id, dto.InterestIds);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new { message = "Інформацію про клуб оновлено." });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteClub(long id)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (club.OwnerId != userId)
            return Forbid();

        _context.Clubs.Remove(club);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Клуб видалено." });
    }

    [HttpPost("{id:long}/join")]
    public async Task<IActionResult> JoinClub(long id, [FromBody] CreateClubJoinRequestDto? dto)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        var membership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == userId);

        if (membership?.Status == "active")
            return BadRequest(new { message = "Ви вже є учасником цього клубу." });

        if (membership?.Status == "blocked")
            return BadRequest(new { message = "Ви не можете подати заявку до цього клубу." });

        if (club.Visibility == "public")
        {
            if (membership != null)
            {
                membership.Status = "active";
                membership.Role = "member";
                membership.JoinedAt = DateTime.UtcNow;
            }
            else
            {
                _context.ClubMembers.Add(new ClubMember
                {
                    ClubId = id,
                    UserId = userId,
                    Role = "member",
                    Status = "active",
                    JoinedAt = DateTime.UtcNow
                });
            }

            await using var transaction =
    await _context.Database.BeginTransactionAsync();

            await _context.SaveChangesAsync();

            await _rating.AwardClubJoinAsync(id, userId);

            await _gamification.AwardXpOnceAsync(
                userId,
                10,
                $"club_join:{id}");

            await _gamification.RegisterActivityAsync(userId);

            await transaction.CommitAsync();

            return Ok(new { message = "Ви приєдналися до клубу." });
        }

        var existingRequest = await _context.ClubJoinRequests.FirstOrDefaultAsync(r => r.ClubId == id && r.UserId == userId && r.Status == "pending");

        if (existingRequest != null)
            return BadRequest(new { message = "Ваша заявка вже очікує розгляду." });

        _context.ClubJoinRequests.Add(new ClubJoinRequest
        {
            ClubId = id,
            UserId = userId,
            Message = dto?.Message?.Trim(),
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var applicantName = await _context.Users.Where(u => u.Id == userId).Select(u => u.Username)
            .FirstAsync();

        await _notifications.ToUserAsync(
            club.OwnerId,
            "club_join_request",
            "Нова заявка на вступ",
            $"{applicantName} хоче приєднатися до клубу «{club.Name}».",
            $"/clubs/{id}"
        );

        return Ok(new { message = "Заявку на вступ успішно надіслано." });

    }

    [HttpDelete("{id:long}/leave")]
    public async Task<IActionResult> LeaveClub(long id)
    {
        var userId = GetUserId();

        var membership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == userId && m.Status == "active");

        if (membership == null)
            return NotFound(new { message = "Ви не є учасником цього клубу." });

        if (membership.Role == "owner")
            return BadRequest(new { message = "Власник не може залишити клуб. Спочатку передайте права власності або видаліть клуб." });

        membership.Status = "left";

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ви залишили клуб." });
    }

    [HttpGet("{id:long}/my-join-request")]
    public async Task<IActionResult> GetMyJoinRequest(long id)
    {
        var userId = GetUserId();
        if (!await _context.Clubs.AnyAsync(c => c.Id == id))
            return NotFound(new { message = "Клуб не знайдено." });

        var request = await _context.ClubJoinRequests.AsNoTracking().Where(r => r.ClubId == id && r.UserId == userId).OrderByDescending(r => r.CreatedAt).Select(r => new { r.Id, r.Status, r.CreatedAt, r.ReviewedAt }).FirstOrDefaultAsync();

        return Ok(request);
    }

    [HttpGet("{id:long}/join-requests")]
    public async Task<IActionResult> GetJoinRequests(long id)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound();

        if (!await CanManageClubAsync(id, userId))
            return Forbid();

        var requests = await _context.ClubJoinRequests.Where(r => r.ClubId == id && r.Status == "pending").OrderBy(r => r.CreatedAt).Select(r => new
        {
            r.Id,
            r.UserId,
            Username = r.User.Username,
            r.Message,
            r.Status,
            r.CreatedAt
        }).ToListAsync();

        return Ok(requests);
    }

    [HttpPatch("{id:long}/join-requests/{requestId:long}")]
    public async Task<IActionResult> ReviewJoinRequest(long id, long requestId, [FromBody] ReviewClubJoinRequestDto dto)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (!await CanManageClubAsync(id, userId))
            return Forbid();

        if (dto.Status != "accepted" && dto.Status != "rejected")
            return BadRequest(new { message = "Статус має бути accepted або rejected." });

        var request = await _context.ClubJoinRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.ClubId == id);

        if (request == null)
            return NotFound(new { message = "Заявку не знайдено." });

        if (request.Status != "pending")
            return BadRequest(new { message = "Цю заявку вже розглянуто." });

        if (dto.Status == "accepted")
        {
            var membership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == request.UserId);

            if (membership == null)
            {
                _context.ClubMembers.Add(new ClubMember
                {
                    ClubId = id,
                    UserId = request.UserId,
                    Role = "member",
                    Status = "active",
                    JoinedAt = DateTime.UtcNow
                });
            }
            else
            {
                if (membership.Status == "blocked")
                    return BadRequest(new { message = "Цей користувач заблокований у клубі." });

                membership.Status = "active";
                membership.Role = "member";
                membership.JoinedAt = DateTime.UtcNow;
            }
        }

        request.Status = dto.Status;
        request.ReviewedAt = DateTime.UtcNow;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await _context.SaveChangesAsync();

        if (dto.Status == "accepted")
        {
            await _rating.AwardClubJoinAsync(id, request.UserId);

            await _gamification.AwardXpOnceAsync(
                request.UserId,
                10,
                $"club_join:{id}");
        }

        await transaction.CommitAsync();

        if (dto.Status == "accepted")
        {
            await _notifications.ToUserAsync(
                request.UserId,
                "join_request_accepted",
                "Заявку на вступ схвалено",
                $"Твою заявку до клубу «{club.Name}» схвалено. Тепер ти учасник клубу!",
                $"/clubs/{id}"
            );
        }
        else
        {
            await _notifications.ToUserAsync(
                request.UserId,
                "join_request_rejected",
                "Заявку на вступ відхилено",
                $"Твою заявку до клубу «{club.Name}» відхилено.",
                "/clubs"
            );
        }

        return Ok(new { message = dto.Status == "accepted" ? "Заявку схвалено. Користувач став учасником клубу." : "Заявку відхилено." });
    }

    [HttpPatch("{id:long}/members/{userId:long}/role")]
    public async Task<IActionResult> UpdateMemberRole(long id, long userId, [FromBody] UpdateClubMemberRoleDto dto)
    {
        long currentUserId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (club.OwnerId != currentUserId)
            return Forbid();

        var member = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == userId && m.Status == "active");

        if (member == null)
            return NotFound(new { message = "Учасника не знайдено." });

        if (userId == club.OwnerId || member.Role == "owner")
            return BadRequest(new { message = "Не можна змінити роль власника клубу." });

        if (member.Role == dto.Role)
            return BadRequest(new { message = "Учасник уже має цю роль." });

        member.Role = dto.Role;

        await _context.SaveChangesAsync();

        if (dto.Role == "admin")
        {
            await _notifications.ToUserAsync(
                userId,
                "moderator_assigned",
                "Тебе призначено модератором",
                $"Тепер ти модератор клубу «{club.Name}». Тобі доступне керування клубом.",
                $"/clubs/{id}"
            );
        }
        else if (dto.Role == "member")
        {
            await _notifications.ToUserAsync(
                userId,
                "moderator_removed",
                "Роль модератора змінено",
                $"Твою роль у клубі «{club.Name}» змінено на звичайного учасника.",
                $"/clubs/{id}"
            );
        }

        return Ok(new
        {
            message = dto.Role == "admin" ? "Учасника призначено модератором." : "Роль модератора знято.",
            userId,
            role = member.Role
        });
    }

    [HttpDelete("{id:long}/members/{userId:long}")]
    public async Task<IActionResult> RemoveClubMember(long id, long userId)
    {
        long currentUserId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        bool isOwner = club.OwnerId == currentUserId;

        bool canManage = isOwner ||
            await CanManageClubAsync(id, currentUserId);

        if (!canManage)
            return Forbid();

        var member = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == userId && m.Status == "active");

        if (member == null)
            return NotFound(new { message = "Учасника не знайдено." });

        if (userId == club.OwnerId || member.Role == "owner")
            return BadRequest(new { message = "Власника клубу не можна виключити." });

        if (!isOwner && member.Role != "member")
            return Forbid();

        member.Status = "blocked";

        await _context.SaveChangesAsync();

        await _notifications.ToUserAsync(
            userId,
            "club_member_removed",
            "Тебе виключено з клубу",
            $"Твою участь у клубі «{club.Name}» припинено.",
            "/clubs"
        );

        return Ok(new { message = "Учасника виключено з клубу." });
    }

    [HttpPost("{id:long}/transfer-ownership")]
    public async Task<IActionResult> TransferOwnership(long id, [FromBody] TransferClubOwnershipDto dto)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (club.OwnerId != userId) return Forbid();

        if (dto.NewOwnerId == userId)
            return BadRequest(new { message = "Ви вже є власником цього клубу." });

        var newOwnerMembership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == dto.NewOwnerId && m.Status == "active");

        if (newOwnerMembership == null)
            return BadRequest(new { message = "Новий власник повинен бути активним учасником клубу." });

        var currentOwnerMembership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == id && m.UserId == userId && m.Status == "active");

        if (currentOwnerMembership == null || currentOwnerMembership.Role != "owner")
            return BadRequest(new { message = "Не вдалося підтвердити членство поточного власника." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            club.OwnerId = dto.NewOwnerId;
            club.UpdatedAt = DateTime.UtcNow;

            newOwnerMembership.Role = "owner";
            currentOwnerMembership.Role = "admin";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _notifications.ToUserAsync(
                dto.NewOwnerId,
                "owner_assigned",
                "Тепер ти власник клубу",
                $"Тобі передано права власника клубу «{club.Name}».",
                $"/clubs/{id}"
            );

            await _notifications.ToUserAsync(
                userId,
                "ownership_transferred",
                "Власність над клубом передано",
                $"Ти передав права власника клубу «{club.Name}» іншому учаснику. Твоя нова роль — модератор.",
                $"/clubs/{id}"
            );

            return Ok(new
            {
                message = "Власність над клубом успішно передано.",
                newOwnerId = dto.NewOwnerId
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpGet("{id:long}/members")]
    public async Task<IActionResult> GetClubMembers(long id)
    {
        var userId = GetUserId();

        var club = await _context.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        var members = await _context.ClubMembers.AsNoTracking().Where(m => m.ClubId == id && m.Status == "active").OrderBy(m => m.Role == "owner" ? 0 : m.Role == "admin" ? 1 : 2).ThenBy(m => m.JoinedAt).Select(m => new ClubMemberDto
        {
            Id = m.Id,
            UserId = m.UserId,
            Username = m.User.Username,
            FirstName = m.User.Profile != null ? m.User.Profile.FirstName : null,
            LastName = m.User.Profile != null ? m.User.Profile.LastName : null,
            AvatarUrl = m.User.Profile != null ? m.User.Profile.AvatarUrl : null,
            Role = m.Role,
            JoinedAt = m.JoinedAt
        }).ToListAsync();

        return Ok(members);
    }

    [Authorize]
    [HttpPost("{clubId:long}/images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadClubImage(long clubId, IFormFile? file)
    {
        const long maxSize = 5 * 1024 * 1024;

        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var club = await _context.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        var canManage =
            club.OwnerId == userId ||
            await _context.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active" && (m.Role == "owner" || m.Role == "moderator"));

        if (!canManage)
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Оберіть зображення." });

        if (file.Length > maxSize)
            return BadRequest(new { message = "Максимальний розмір зображення — 5 МБ." });

        var extension = Path.GetExtension(file.FileName)
            .ToLowerInvariant();

        var allowedTypes = new Dictionary<string, string>
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

        if (!allowedTypes.TryGetValue(extension, out var expectedType) || !string.Equals(file.ContentType, expectedType, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Дозволені лише JPG, PNG та WebP." });
        }
        var signature = new byte[12];

        await using (var input = file.OpenReadStream())
        {
            var bytesRead = 0;

            while (bytesRead < signature.Length)
            {
                var read = await input.ReadAsync(signature.AsMemory(bytesRead));

                if (read == 0) break;

                bytesRead += read;
            }

            if (bytesRead < signature.Length)
                return BadRequest(new { message = "Некоректний файл зображення." });
        }

        var valid = extension switch
        {
            ".jpg" or ".jpeg" =>
                signature[0] == 0xFF &&
                signature[1] == 0xD8 &&
                signature[2] == 0xFF,

            ".png" =>
                signature.AsSpan(0, 8).SequenceEqual(
                    new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),

            ".webp" =>
                System.Text.Encoding.ASCII.GetString(signature, 0, 4) == "RIFF" &&
                System.Text.Encoding.ASCII.GetString(signature, 8, 4) == "WEBP",

            _ => false
        };

        if (!valid)
            return BadRequest(new { message = "Вміст файлу не відповідає його формату." });

        var root = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

        var folder = Path.Combine(root, "uploads", "clubs", clubId.ToString());

        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(folder, fileName);

        await using (var output = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(output);
        }

        return Ok(new
        {
            url = $"/uploads/clubs/{clubId}/{fileName}"
        });
    }
}
