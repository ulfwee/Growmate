using System.Security.Claims;
using backend.Data;
using backend.DTOs.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDBContext _context;

    public NotificationsController(AppDBContext context) => _context = context;

    #region Methods

    private bool TryGetUserId(out long userId) => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (page < 1 || pageSize < 1 || pageSize > 100) return BadRequest(new { message = "Некоректні параметри пагінації." });

        var query = _context.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        var totalCount = await query.CountAsync();
        var unreadCount = await query.CountAsync(n => !n.IsRead);
        var items = await query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).Skip((page - 1) * pageSize).Take(pageSize).Select(n => new NotificationDto
        {
            Id = n.Id,
            Type = n.Type,
            Title = n.Title,
            Message = n.Message,
            TargetUrl = n.TargetUrl,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToListAsync();

        return Ok(new
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var count = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { UnreadCount = count });
    }

    [HttpPatch("{id:long}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification == null) return NotFound(new { message = "Сповіщення не знайдено." });

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Сповіщення прочитано." });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var updatedCount = await _context.Notifications.Where(n => n.UserId == userId && !n.IsRead).ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true));
        return Ok(new { message = "Усі сповіщення прочитано.", updatedCount });
    }
}
