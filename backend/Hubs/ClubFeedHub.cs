using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Hubs;

[Authorize]
public class ClubFeedHub : Hub
{
    private readonly AppDBContext _context;
    public ClubFeedHub(AppDBContext context)
    {
        _context = context;
    }

    public async Task JoinClub(long clubId)
    {
        var userIdValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdValue, out var userId))
            throw new HubException("Не авторизовано.");

        var club = await _context.Clubs.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clubId);
        if (club == null)
            throw new HubException("Клуб не знайдено.");

        var isMember = await _context.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");
        if (!isMember && club.OwnerId != userId)
            throw new HubException("Немає доступу до клубу.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"club-{clubId}");
    }

    public async Task LeaveClub(long clubId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"club-{clubId}");
    }
}