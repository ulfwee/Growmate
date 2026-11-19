using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Services;

public class ClubRatingService
{
    private readonly AppDBContext _db;

    public ClubRatingService(AppDBContext db)
    {
        _db = db;
    }

    public const int GroupTaskPoints = 10;
    public const int ReportPoints = 5;
    public const int EventPoints = 5;
    public const int ClubJoinPoints = 5;
    public const int GroupGoalJoinPoints = 5;
    public const int MaxRewardedReportsPerDay = 3;

    #region Methods
    private async Task AwardAsync(long clubId, long userId, string actionType, long sourceId, int points)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO club_point_transactions
                (club_id, user_id, action_type,
                 source_id, points, created_at)
            VALUES
                ({clubId}, {userId}, {actionType},
                 {sourceId}, {points}, NOW())
            ON CONFLICT
                (club_id, user_id, action_type, source_id)
            DO NOTHING
        ");
    }

    private async Task RemoveAsync(long clubId, long userId, string actionType, long sourceId)
    {
        await _db.ClubPointTransactions.Where(p => p.ClubId == clubId && p.UserId == userId && p.ActionType == actionType && p.SourceId == sourceId).ExecuteDeleteAsync();
    }
    #endregion

    public async Task AwardGroupTaskAsync(long clubId, long userId, long taskId)
    {
        await AwardAsync(clubId, userId, "group_task", taskId, GroupTaskPoints);
    }

    public Task AwardClubJoinAsync(long clubId, long userId)
    {
        return AwardAsync(clubId, userId, "club_join", clubId, ClubJoinPoints);
    }

    public Task AwardGroupGoalJoinAsync(long clubId, long userId, long goalId)
    {
        return AwardAsync(clubId, userId, "group_goal_join", goalId, GroupGoalJoinPoints);
    }

    public async Task AwardReportAsync(long clubId, long userId, long postId)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var rewardedReports = await _db.ClubPointTransactions.CountAsync(p => p.ClubId == clubId && p.UserId == userId && p.ActionType == "report" && p.CreatedAt >= today && p.CreatedAt < tomorrow);

        if (rewardedReports >= MaxRewardedReportsPerDay)
            return;

        await AwardAsync(clubId, userId, "report", postId, ReportPoints);
    }

    public async Task AwardEventAsync(long clubId, long userId, long eventId)
    {
        await AwardAsync(clubId, userId, "event", eventId, EventPoints);
    }

    public Task RemoveGroupTaskPointsAsync(long clubId, long userId, long taskId) => RemoveAsync(clubId, userId, "group_task", taskId);
    public Task RemoveReportPointsAsync(long clubId, long userId, long postId) => RemoveAsync(clubId, userId, "report", postId);
    public Task RemoveEventPointsAsync(long clubId, long userId, long eventId) => RemoveAsync(clubId, userId, "event", eventId);
}
