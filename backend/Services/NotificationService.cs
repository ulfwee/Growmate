using backend.Data;
using backend.DTOs.Notifications;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class NotificationService
{
    private readonly AppDBContext _context;
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationService(AppDBContext context, IHubContext<NotificationHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    #region Methods
    private static NotificationDto ToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            Type = notification.Type,
            Title = notification.Title,
            Message = notification.Message,
            TargetUrl = notification.TargetUrl,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
    }
    #endregion

    public async Task SendToUserAsync(long userId, string type, string title, string message, string? targetUrl = null)
    {
        await SendToUsersAsync(new[] { userId }, type, title, message, targetUrl);
    }

    public async Task SendToClubAsync(long clubId, string type, string title, string message, string? targetUrl = null, long? excludeUserId = null)
    {
        var club = await _context.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId);
        if (club == null)
            return;

        var userIds = await _context.ClubMembers.AsNoTracking().Where(m => m.ClubId == clubId && m.Status == "active").Select(m => m.UserId).Distinct().ToListAsync();
        userIds.Add(club.OwnerId);

        if (excludeUserId.HasValue)
            userIds.RemoveAll(id => id == excludeUserId.Value);

        await SendToUsersAsync(userIds, type, title, message, targetUrl);
    }

    public async Task SendToUsersAsync(IEnumerable<long> userIds, string type, string title, string message, string? targetUrl = null)
    {
        var ids = userIds.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0)
            return;

        var now = DateTime.UtcNow;
        var notifications = ids.Select(id => new Notification
        {
            UserId = id,
            Type = type,
            Title = title,
            Message = message,
            TargetUrl = targetUrl,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();

        foreach (var notification in notifications)
        {
            try
            {
                await _hub.Clients.Group($"notifications-user-{notification.UserId}").SendAsync("ReceiveNotification", ToDto(notification));
            }
            catch (Exception)
            {
            }
        }
    }
}
