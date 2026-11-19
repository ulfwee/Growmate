using System.Security.Claims;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/my/group-goals")]
public class MyGroupGoalsController : ControllerBase
{
    private readonly AppDBContext _db;

    public MyGroupGoalsController(AppDBContext db) => _db = db;

    #region Methods

    private long? UserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetMyGoals()
    {
        if (UserId is not long userId) return Unauthorized();

        var goals = await (
            from p in _db.GroupGoalParticipants
            join g in _db.GroupGoals on p.GroupGoalId equals g.Id
            join m in _db.ClubMembers on new { ClubId = g.ClubId, UserId = userId } equals new { m.ClubId, m.UserId }
            where p.UserId == userId && m.Status == "active"
            select new
            {
                g.Id,
                g.ClubId,
                g.Title,
                g.Description,
                g.StartDate,
                g.EndDate,
                g.Status
            }
        ).Distinct().ToListAsync();

        var result = new List<object>();
        foreach (var goal in goals)
        {
            var total = await _db.GroupGoalTasks.CountAsync(t => t.GroupGoalId == goal.Id);
            var completed = await (
                from t in _db.GroupGoalTasks
                join c in _db.GroupGoalTaskCompletions on t.Id equals c.GroupGoalTaskId
                where t.GroupGoalId == goal.Id && c.UserId == userId
                select t.Id
            ).CountAsync();

            var progress = total == 0 ? 0 : Math.Round(100.0 * completed / total, 2);
            result.Add(new
            {
                goal.Id,
                goal.ClubId,
                goal.Title,
                goal.Description,
                goal.StartDate,
                goal.EndDate,
                goal.Status,
                TasksCount = total,
                CompletedTasks = completed,
                MyProgress = progress,
                IsPersonallyCompleted = total > 0 && completed == total
            });
        }

        return Ok(result);
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetMyTasks()
    {
        if (UserId is not long userId) return Unauthorized();

        var tasks = await (
            from t in _db.GroupGoalTasks
            join g in _db.GroupGoals on t.GroupGoalId equals g.Id
            join club in _db.Clubs on g.ClubId equals club.Id
            join p in _db.GroupGoalParticipants on g.Id equals p.GroupGoalId
            join m in _db.ClubMembers on new { ClubId = g.ClubId, UserId = userId } equals new { m.ClubId, m.UserId }
            where p.UserId == userId && m.Status == "active"
            orderby t.DueDate, t.SortOrder, t.Id
            select new
            {
                t.Id,
                t.GroupGoalId,
                t.Title,
                t.Description,
                t.SortOrder,
                t.DueDate,
                g.ClubId,
                GroupGoalTitle = g.Title,
                GroupGoalStatus = g.Status,
                ClubName = club.Name,
                IsCompleted = _db.GroupGoalTaskCompletions.Any(c => c.GroupGoalTaskId == t.Id && c.UserId == userId)
            }
        ).Distinct().ToListAsync();

        return Ok(tasks);
    }
}
