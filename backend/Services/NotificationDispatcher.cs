namespace backend.Services;

public class NotificationDispatcher
{
    private readonly NotificationService _notifications;
    private readonly ILogger<NotificationDispatcher> _logger;

    public NotificationDispatcher(NotificationService notifications, ILogger<NotificationDispatcher> logger)
    {
        _notifications = notifications;
        _logger = logger;
    }

    public async Task ToUserAsync(long userId, string type, string title, string message, string? targetUrl = null)
    {
        try
        {
            await _notifications.SendToUserAsync(userId, type, title, message, targetUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Не вдалося створити сповіщення {Type} для {UserId}", type, userId);
        }
    }

    public async Task ToClubAsync(long clubId, string type, string title, string message, string? targetUrl = null, long? excludeUserId = null)
    {
        try
        {
            await _notifications.SendToClubAsync(clubId, type, title, message, targetUrl, excludeUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Не вдалося створити сповіщення {Type} для клубу {ClubId}", type, clubId);
        }
    }
}
