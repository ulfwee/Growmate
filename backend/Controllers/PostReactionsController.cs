using System.Security.Claims;
using backend.Data;
using backend.DTOs.PostReactions;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/posts/{postId:long}/reactions")]
[Authorize]
public class PostReactionsController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly NotificationDispatcher _notifications;

    public PostReactionsController(AppDBContext context, NotificationDispatcher notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static readonly string[] AllowedReactions = { "like", "love", "clap", "support" };

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
    public async Task<IActionResult> GetReactions(long postId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!await CanViewPost(postId, userId)) return NotFound(new { message = "Публікацію не знайдено або вона недоступна." });

        var reactions = await _context.PostReactions.AsNoTracking().Where(r => r.PostId == postId).OrderBy(r => r.CreatedAt).Select(r => new PostReactionDto
        {
            Id = r.Id,
            PostId = r.PostId,
            UserId = r.UserId,
            Username = r.User.Username,
            AvatarUrl = r.User.Profile != null ? r.User.Profile.AvatarUrl : null,
            ReactionType = r.ReactionType,
            CreatedAt = r.CreatedAt
        }).ToListAsync();

        return Ok(reactions);
    }

    [HttpPut]
    public async Task<IActionResult> SetReaction(long postId, [FromBody] UpdatePostReactionDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!AllowedReactions.Contains(dto.ReactionType)) return BadRequest(new { message = "Невідомий тип реакції." });
        if (!await CanViewPost(postId, userId)) return NotFound(new { message = "Публікацію не знайдено або вона недоступна." });

        var reaction = await _context.PostReactions.FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);
        var isNewReaction = reaction == null;

        if (reaction == null)
        {
            reaction = new PostReaction
            {
                PostId = postId,
                UserId = userId,
                ReactionType = dto.ReactionType,
                CreatedAt = DateTime.UtcNow
            };
            _context.PostReactions.Add(reaction);
        }
        else
        {
            reaction.ReactionType = dto.ReactionType;
            reaction.CreatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        if (isNewReaction)
        {
            var postInfo = await _context.Posts.AsNoTracking().Where(p => p.Id == postId).Select(p => new { p.UserId, p.ClubId }).FirstAsync();
            if (postInfo.UserId != userId)
            {
                var username = await _context.Users.Where(u => u.Id == userId).Select(u => u.Username).FirstAsync();
                var targetUrl = postInfo.ClubId.HasValue ? $"activity?club={postInfo.ClubId.Value}" : "/activity";
                await _notifications.ToUserAsync(postInfo.UserId, "post_reaction", "Нова реакція на твій допис", $"{username} відреагував на твій допис.", targetUrl);
            }
        }

        return Ok(new { message = "Реакцію збережено.", reactionType = reaction.ReactionType });
    }

    [HttpDelete]
    public async Task<IActionResult> RemoveReaction(long postId)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var reaction = await _context.PostReactions.FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);
        if (reaction == null) return NotFound(new { message = "Вашу реакцію не знайдено." });

        _context.PostReactions.Remove(reaction);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Реакцію видалено." });
    }
}