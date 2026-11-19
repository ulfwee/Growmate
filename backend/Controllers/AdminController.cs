using backend.Data;
using backend.DTOs.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDBContext _context;

    public AdminController(AppDBContext context)
    {
        _context = context;
    }

    #region Methods
    private static bool ValidPagination(int page, int pageSize)
    {
        return page >= 1 && pageSize >= 1 && pageSize <= 100;
    }
    private static object Paginated<T>(List<T> items, int totalCount, int page, int pageSize)
    {
        return new
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }
    #endregion

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u => EF.Functions.ILike(u.Username, $"%{term}%") || EF.Functions.ILike(u.Email, $"%{term}%"));
        }

        var totalCount = await query.CountAsync();

        var users = await query.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Role,
                u.CreatedAt,
                FirstName = u.Profile != null ? u.Profile.FirstName : null,
                LastName = u.Profile != null ? u.Profile.LastName : null,
                AvatarUrl = u.Profile != null ? u.Profile.AvatarUrl : null,
                TotalXp = u.Profile != null ? u.Profile.TotalXp : 0,
                ClubsCount = _context.ClubMembers.Count(cm => cm.UserId == u.Id && cm.Status == "active"),
                PostsCount = _context.Posts.Count(p => p.UserId == u.Id)
            }).ToListAsync();

        return Ok(Paginated(users, totalCount, page, pageSize));
    }

    [HttpGet("users/{id:long}")]
    public async Task<IActionResult> GetUser(long id)
    {
        var user = await _context.Users.AsNoTracking().Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Role,
                u.CreatedAt,
                FirstName = u.Profile != null ? u.Profile.FirstName : null,
                LastName = u.Profile != null ? u.Profile.LastName : null,
                AvatarUrl = u.Profile != null ? u.Profile.AvatarUrl : null,
                Bio = u.Profile != null ? u.Profile.Bio : null,
                TotalXp = u.Profile != null ? u.Profile.TotalXp : 0,
                GoalsCount = _context.Goals.Count(g => g.UserId == u.Id),
                CompletedGoalsCount = _context.Goals.Count(g => g.UserId == u.Id && g.Status == "completed"),
                ClubsCount = _context.ClubMembers.Count(cm => cm.UserId == u.Id && cm.Status == "active"),
                PostsCount = _context.Posts.Count(p => p.UserId == u.Id)
            }).FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { message = "Користувача не знайдено." });

        return Ok(user);
    }

    [HttpGet("clubs")]
    public async Task<IActionResult> GetClubs([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.Clubs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(c => EF.Functions.ILike(c.Name, $"%{term}%"));
        }

        var totalCount = await query.CountAsync();

        var clubs = await query.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.Visibility,
                c.CoverUrl,
                c.OwnerId,
                OwnerUsername = c.Owner.Username,
                CategoryName = c.Category.Name,
                c.CreatedAt,
                MembersCount = c.Members.Count(m => m.Status == "active"),
                PostsCount = _context.Posts.Count(p => p.ClubId == c.Id)
            }).ToListAsync();

        return Ok(Paginated(clubs, totalCount, page, pageSize));
    }

    [HttpDelete("clubs/{id:long}")]
    public async Task<IActionResult> DeleteClub(long id)
    {
        var club = await _context.Clubs.FindAsync(id);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        _context.Clubs.Remove(club);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Клуб успішно видалено." });
    }

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.Posts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p => EF.Functions.ILike(p.Content, $"%{term}%"));
        }

        var totalCount = await query.CountAsync();

        var posts = await query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Content,
                p.ImageUrl,
                p.PostType,
                p.ClubId,
                ClubName = p.Club != null ? p.Club.Name : null,
                p.UserId,
                Username = p.User.Username,
                p.CreatedAt,
                CommentsCount = p.Comments.Count(),
                ReactionsCount = p.Reactions.Count()
            }).ToListAsync();

        return Ok(Paginated(posts, totalCount, page, pageSize));
    }

    [HttpDelete("posts/{id:long}")]
    public async Task<IActionResult> DeletePost(long id)
    {
        var post = await _context.Posts.FindAsync(id);

        if (post == null)
            return NotFound(new { message = "Допис не знайдено." });

        _context.Posts.Remove(post);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Допис успішно видалено." });
    }

    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.ClubAnnouncements.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a => EF.Functions.ILike(a.Title, $"%{term}%") || EF.Functions.ILike(a.Content, $"%{term}%"));
        }

        var totalCount = await query.CountAsync();

        var announcements = await query.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Content,
                a.ImageUrl,
                a.AnnouncementType,
                a.IsPinned,
                a.ClubId,
                a.AuthorId,
                a.CreatedAt
            }).ToListAsync();

        return Ok(Paginated(announcements, totalCount, page, pageSize));
    }

    [HttpDelete("announcements/{id:long}")]
    public async Task<IActionResult> DeleteAnnouncement(long id)
    {
        var announcement = await _context.ClubAnnouncements.FindAsync(id);

        if (announcement == null)
            return NotFound(new { message = "Оголошення не знайдено." });

        await _context.ClubAnnouncementLikes.Where(l => l.AnnouncementId == id).ExecuteDeleteAsync();

        _context.ClubAnnouncements.Remove(announcement);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Оголошення успішно видалено." });
    }

    [HttpDelete("users/{id:long}")]
    public async Task<IActionResult> DeleteUser(long id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound(new { message = "Користувача не знайдено." });

        if (user.Role == "admin")
            return BadRequest(new { message = "Не можна видалити адміністратора." });

        var ownedClubs = await _context.Clubs.AnyAsync(c => c.OwnerId == id);

        if (ownedClubs)
            return BadRequest(new { message = "Користувач є власником клубів. Спочатку передайте власність або видаліть клуби." });

        _context.Users.Remove(user);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Користувача успішно видалено." });
    }

    [HttpPatch("clubs/{clubId:long}/transfer-ownership")]
    public async Task<IActionResult> TransferClubOwnership(long clubId, [FromBody] AdminTransferOwnershipDto dto)
    {
        var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == clubId);

        if (club == null)
            return NotFound(new { message = "Клуб не знайдено." });

        if (club.OwnerId == dto.NewOwnerId)
            return BadRequest(new { message = "Цей користувач уже є власником клубу." });

        var newOwnerMembership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == dto.NewOwnerId && m.Status == "active");

        if (newOwnerMembership == null)
            return BadRequest(new { message = "Новий власник повинен бути активним учасником клубу." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var oldOwnerMembership = await _context.ClubMembers.FirstOrDefaultAsync(m => m.ClubId == clubId && m.UserId == club.OwnerId);

        if (oldOwnerMembership == null)
            return Conflict(new { message = "Не знайдено запис поточного власника серед учасників клубу." });

        oldOwnerMembership.Role = "member";
        newOwnerMembership.Role = "owner";

        club.OwnerId = dto.NewOwnerId;
        club.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "Власність над клубом успішно передано.", clubId = club.Id, newOwnerId = dto.NewOwnerId });
    }

    [HttpGet("clubs/{clubId:long}/members")]
    public async Task<IActionResult> GetClubMembers(long clubId)
    {
        var clubExists = await _context.Clubs.AnyAsync(c => c.Id == clubId);

        if (!clubExists)
            return NotFound(new { message = "Клуб не знайдено." });

        var members = await _context.ClubMembers.AsNoTracking()
            .Where(m => m.ClubId == clubId && m.Status == "active")
            .Join(
                _context.Users.AsNoTracking(),
                member => member.UserId,
                user => user.Id,
                (member, user) => new
                {
                    UserId = user.Id,
                    Username = user.Username,
                    Role = member.Role,
                    Status = member.Status
                })
            .OrderBy(m => m.Username)
            .ToListAsync();

        return Ok(members);
    }
}