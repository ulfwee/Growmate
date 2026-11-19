using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs.Posts;
using backend.Hubs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ClubFeedHub> _hub;
    private readonly ClubRatingService _rating;
    private readonly GamificationService _gamification;
    private readonly NotificationDispatcher _notifications;

    public PostsController(AppDBContext context, IHubContext<ClubFeedHub> hub, ClubRatingService rating, GamificationService gamification, IWebHostEnvironment environment, NotificationDispatcher notifications)
    {
        _context = context;
        _hub = hub;
        _rating = rating;
        _gamification = gamification;
        _environment = environment;
        _notifications = notifications;
    }

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static readonly string[] AllowedPostTypes = { "report", "achievement", "update" };

    private Task<bool> IsActiveClubMember(long clubId, long userId) => _context.ClubMembers.AsNoTracking().AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");

    private IQueryable<PostDto> BuildPostQuery(long userId)
    {
        return _context.Posts.AsNoTracking().Select(p => new PostDto
        {
            Id = p.Id,
            UserId = p.UserId,
            Username = p.User.Username,
            AvatarUrl = p.User.Profile != null ? p.User.Profile.AvatarUrl : null,
            ClubId = p.ClubId,
            GoalId = p.GoalId,
            GroupGoalId = p.GroupGoalId,
            PostType = p.PostType,
            Content = p.Content,
            ImageUrl = p.ImageUrl,
            CommentsCount = p.Comments.Count(),
            ReactionsCount = p.Reactions.Count(),
            MyReaction = p.Reactions.Where(r => r.UserId == userId).Select(r => r.ReactionType).FirstOrDefault(),
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        });
    }

    #endregion

    [HttpGet("club/{clubId:long}")]
    public async Task<IActionResult> GetClubPosts(long clubId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!await _context.Clubs.AnyAsync(c => c.Id == clubId))
            return NotFound(new { message = "Клуб не знайдено." });
        if (!await IsActiveClubMember(clubId, userId)) return Forbid();

        var posts = await BuildPostQuery(userId).Where(p => p.ClubId == clubId).OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(posts);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyPosts()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var accessibleClubIds = _context.ClubMembers.AsNoTracking().Where(m => m.UserId == userId && m.Status == "active").Select(m => m.ClubId);
        var posts = await BuildPostQuery(userId).Where(p => p.UserId == userId &&
                (!p.ClubId.HasValue || accessibleClubIds.Contains(p.ClubId.Value))).OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(posts);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetPost(long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var post = await BuildPostQuery(userId).FirstOrDefaultAsync(p => p.Id == id);
        if (post == null) return NotFound(new { message = "Публікацію не знайдено." });
        if (post.ClubId.HasValue && !await IsActiveClubMember(post.ClubId.Value, userId))
            return Forbid();
        return Ok(post);
    }
    [HttpPost("upload")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAttachment([FromForm] long clubId, IFormFile file)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!await IsActiveClubMember(clubId, userId)) return Forbid();
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Оберіть файл." });
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "Максимальний розмір вкладення — 10 МБ." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var supported = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".docx", ".txt" };
        if (!supported.Contains(extension))
            return BadRequest(new { message = "Непідтримуваний формат файлу." });
        var header = new byte[12];
        await using (var input = file.OpenReadStream())
        {
            var read = await input.ReadAsync(header.AsMemory());
            var valid = extension switch
            {
                ".jpg" or ".jpeg" => read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => read >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
                ".webp" => read >= 12 && Encoding.ASCII.GetString(header, 0, 4) == "RIFF" && Encoding.ASCII.GetString(header, 8, 4) == "WEBP",
                ".pdf" => read >= 5 && Encoding.ASCII.GetString(header, 0, 5) == "%PDF-",
                ".docx" => read >= 4 && header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
                ".txt" => !header.Take(read).Contains((byte)0),
                _ => false
            };
            if (!valid) return BadRequest(new { message = "Вміст файлу не відповідає його формату." });
        }

        var folder = Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads", "posts");
        Directory.CreateDirectory(folder);
        var original = Path.GetFileNameWithoutExtension(file.FileName);
        var safeName = new string(original.Where(c => char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_').Take(50).ToArray());
        if (string.IsNullOrEmpty(safeName)) safeName = "attachment";
        var name = $"{Guid.NewGuid():N}_{safeName}{extension}";
        var path = Path.Combine(folder, name);
        await using (var output = new FileStream(path, FileMode.CreateNew))
            await file.CopyToAsync(output);
        return Ok(new { url = $"/uploads/posts/{name}", fileName = file.FileName });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Текст публікації обов'язковий." });
        if (!AllowedPostTypes.Contains(dto.PostType))
            return BadRequest(new { message = "Некоректний тип публікації." });

        if (dto.ClubId.HasValue && !await IsActiveClubMember(dto.ClubId.Value, userId))
            return Forbid();

        if (dto.GoalId.HasValue && !await _context.Goals.AnyAsync(g =>
                g.Id == dto.GoalId.Value && g.UserId == userId))
            return BadRequest(new { message = "Вказана ціль не існує або не належить вам." });

        if (dto.GroupGoalId.HasValue)
        {
            var groupGoal = await _context.GroupGoals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == dto.GroupGoalId.Value);
            if (groupGoal == null)
                return BadRequest(new { message = "Групову ціль не знайдено." });
            if (!dto.ClubId.HasValue || dto.ClubId.Value != groupGoal.ClubId)
                return BadRequest(new { message = "Групова ціль повинна належати клубу публікації." });
            if (!await _context.GroupGoalParticipants.AnyAsync(p =>
                    p.GroupGoalId == dto.GroupGoalId.Value && p.UserId == userId))
                return BadRequest(new { message = "Ви не берете участі в цій груповій цілі." });
            if (!await IsActiveClubMember(groupGoal.ClubId, userId)) return Forbid();
        }

        var now = DateTime.UtcNow;
        var post = new Post
        {
            UserId = userId,
            ClubId = dto.ClubId,
            GoalId = dto.GoalId,
            GroupGoalId = dto.GroupGoalId,
            PostType = dto.PostType,
            Content = dto.Content.Trim(),
            ImageUrl = dto.ImageUrl?.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };
        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();

            if (post.ClubId.HasValue)
            {
                await _rating.AwardReportAsync(post.ClubId.Value, userId, post.Id);

                await _gamification.AwardXpOnceAsync(userId, 10, $"club_post:{post.Id}");
            }

            await transaction.CommitAsync();
            await _gamification.CheckAchievementsAsync(userId);
        }

        var result = await BuildPostQuery(userId).FirstAsync(p => p.Id == post.Id);

        if (post.ClubId.HasValue)
        {
            var clubId = post.ClubId.Value;
            await _hub.Clients.Group($"club-{clubId}").SendAsync("PostCreated", new
            {
                PostId = post.Id,
                ClubId = clubId
            });
            var username = await _context.Users.Where(u => u.Id == userId).Select(u => u.Username).FirstAsync();

            await _notifications.ToClubAsync(clubId, "new_post", "Новий допис у клубі", $"{username} опублікував новий допис.",
                $"/activity?club={clubId}",
                excludeUserId: userId
            );
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id },
            result
        );

    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdatePost(long id, [FromBody] UpdatePostDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (post == null) return NotFound(new { message = "Публікацію не знайдено." });
        if (post.ClubId.HasValue && !await IsActiveClubMember(post.ClubId.Value, userId))
            return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Текст публікації не може бути порожнім." });

        post.Content = dto.Content.Trim();
        post.ImageUrl = dto.ImageUrl?.Trim();
        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        if (post.ClubId.HasValue)
            await _hub.Clients.Group($"club-{post.ClubId.Value}").SendAsync("PostUpdated", new { PostId = post.Id, ClubId = post.ClubId.Value });
        return Ok(new { message = "Публікацію оновлено." });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeletePost(long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (post == null) return NotFound(new { message = "Публікацію не знайдено." });
        var clubId = post.ClubId;

        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            if (clubId.HasValue)
                await _rating.RemoveReportPointsAsync(clubId.Value, userId, post.Id);

            await transaction.CommitAsync();
            await _gamification.CheckAchievementsAsync(userId);
        }
        if (clubId.HasValue)
            await _hub.Clients.Group($"club-{clubId.Value}").SendAsync("PostDeleted", new { PostId = id, ClubId = clubId.Value });
        return Ok(new { message = "Публікацію видалено." });
    }
}
