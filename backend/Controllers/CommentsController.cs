using System.Security.Claims;
using backend.Data;
using backend.DTOs.Comments;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/posts/{postId:long}/comments")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly NotificationDispatcher _notifications;

    public CommentsController(AppDBContext context, NotificationDispatcher notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    #region Methods

    private bool TryGetUserId(out long userId)
    {
        return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }

    private async Task<bool> CanViewPost(long postId, long userId)
    {
        var post = await _context.Posts.AsNoTracking().Where(p => p.Id == postId).Select(p => new { p.ClubId }).FirstOrDefaultAsync();
        if (post == null) return false;
        if (!post.ClubId.HasValue) return true;

        var club = await _context.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == post.ClubId.Value);
        if (club == null) return false;
        if (club.Visibility == "public") return true;

        return club.OwnerId == userId || await _context.ClubMembers.AnyAsync(m => m.ClubId == club.Id && m.UserId == userId && m.Status == "active");
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetComments(long postId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!await CanViewPost(postId, userId)) return NotFound(new { message = "Публікацію не знайдено або вона недоступна." });

        var comments = await _context.Comments.AsNoTracking().Where(c => c.PostId == postId).OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                PostId = c.PostId,
                UserId = c.UserId,
                Username = c.User.Username,
                AvatarUrl = c.User.Profile != null ? c.User.Profile.AvatarUrl : null,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            }).ToListAsync();

        return Ok(comments);
    }

    [HttpPost]
    public async Task<IActionResult> CreateComment(long postId, [FromBody] CUCommentDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest(new { message = "Текст коментаря обов'язковий." });
        if (!await CanViewPost(postId, userId)) return NotFound(new { message = "Публікацію не знайдено або вона недоступна." });

        var now = DateTime.UtcNow;
        var comment = new Comment
        {
            PostId = postId,
            UserId = userId,
            Content = dto.Content.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var result = await _context.Comments.Where(c => c.Id == comment.Id)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                PostId = c.PostId,
                UserId = c.UserId,
                Username = c.User.Username,
                AvatarUrl = c.User.Profile != null ? c.User.Profile.AvatarUrl : null,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            }).FirstAsync();

        var postInfo = await _context.Posts.AsNoTracking().Where(p => p.Id == postId).Select(p => new { p.UserId, p.ClubId }).FirstAsync();

        if (postInfo.UserId != userId)
        {
            var targetUrl = postInfo.ClubId.HasValue ? $"/clubs/{postInfo.ClubId.Value}" : "/activity";
            await _notifications.ToUserAsync(postInfo.UserId, "post_comment", "Новий коментар до твого допису", $"{result.Username} прокоментував твій допис.", targetUrl);
        }

        return Ok(result);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateComment(long postId, long id, [FromBody] CUCommentDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == id && c.PostId == postId && c.UserId == userId);
        if (comment == null) return NotFound(new { message = "Коментар не знайдено." });
        if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest(new { message = "Текст коментаря не може бути порожнім." });

        comment.Content = dto.Content.Trim();
        comment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Коментар оновлено." });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteComment(long postId, long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == id && c.PostId == postId && c.UserId == userId);
        if (comment == null) return NotFound(new { message = "Коментар не знайдено." });

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Коментар видалено." });
    }
}
