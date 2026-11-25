using System.Security.Claims;
using backend.Data;
using backend.DTOs.GroupGoals;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/group-goals/{goalId:long}/tasks")]
public class GroupGoalTasksController : ControllerBase
{
    private readonly AppDBContext _db;
    public GroupGoalTasksController(AppDBContext db)
    {
        _db = db;
    }

    #region Methods

    private long? UserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private Task<bool> IsMember(long clubId, long userId)
    {
        return _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");
    }

    private Task<bool> IsManager(long clubId, long userId)
    {
        return _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active" && (m.Role == "owner" || m.Role == "admin" || m.Role == "moderator"));
    }

    private Task<bool> IsParticipant(long goalId, long userId)
    {
        return _db.GroupGoalParticipants.AnyAsync(p => p.GroupGoalId == goalId && p.UserId == userId);
    }

    private Task<bool> GoalExists(long clubId, long goalId)
    {
        return _db.GroupGoals.AnyAsync(g => g.Id == goalId && g.ClubId == clubId);
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetTasks(long clubId, long goalId)
    {
        if (UserId is not long userId)
            return Unauthorized();

        if (!await IsMember(clubId, userId))
            return Forbid();

        if (!await GoalExists(clubId, goalId))
            return NotFound();

        bool joined = await IsParticipant(goalId, userId);

        var tasks = await _db.GroupGoalTasks.AsNoTracking().Where(t => t.GroupGoalId == goalId).OrderBy(t => t.DueDate).ThenBy(t => t.SortOrder).ThenBy(t => t.Id).Select(t => new
        {
            t.Id,
            t.GroupGoalId,
            t.Title,
            t.Description,
            t.SortOrder,
            t.DueDate,
            t.CreatedAt,
            t.ReviewCriteria,
            t.RequiresAttachment,

            IsCompleted = joined && _db.GroupGoalTaskCompletions.Any(c => c.GroupGoalTaskId == t.Id && c.UserId == userId),

            MySubmission = t.Submissions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.SubmittedAt)
                .ThenByDescending(s => s.Id)
                .Select(s => new
                {
                    s.Id,
                    s.ReportText,
                    s.EvidenceUrl,
                    s.Status,
                    s.Rating,
                    s.ReviewComment,
                    s.SubmittedAt,
                    s.ReviewedAt,
                    s.ReviewedBy,
                    ReviewerUsername = s.Reviewer != null ? s.Reviewer.Username : null,
                    Attachments = s.Attachments.Select(a => new
                    {
                        a.Id,
                        a.FileUrl,
                        a.FileName,
                        a.ContentType,
                        a.FileSize
                    }).ToList()
                }).FirstOrDefault()
        }).ToListAsync();

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask(long clubId, long goalId,
        [FromBody] GroupGoalTaskInputDto dto)
    {
        if (UserId is not long userId)
            return Unauthorized();

        if (!await IsManager(clubId, userId))
            return Forbid();

        var goal = await _db.GroupGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.ClubId == clubId);

        if (goal == null)
            return NotFound();

        if (goal.Status is "completed" or "cancelled")
            return BadRequest(new { message = "Ціль закрита для змін." });

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Вкажіть назву завдання." });

        if (dto.DueDate is not DateOnly dueDate)
            return BadRequest(new { message = "Вкажіть дату виконання завдання." });

        if (dueDate < goal.StartDate || dueDate > goal.EndDate)
            return BadRequest(new { message = "Дата завдання повинна належати періоду групової цілі." });

        var task = new GroupGoalTask
        {
            GroupGoalId = goalId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            SortOrder = dto.SortOrder,
            DueDate = dueDate,
            ReviewCriteria = dto.ReviewCriteria?.Trim(),
            RequiresAttachment = dto.RequiresAttachment
        };

        _db.GroupGoalTasks.Add(task);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            task.Id,
            task.GroupGoalId,
            task.Title,
            task.Description,
            task.SortOrder,
            task.DueDate,
            task.CreatedAt,
            task.ReviewCriteria,
            task.RequiresAttachment
        });
    }

    [HttpPut("{taskId:long}")]
    public async Task<IActionResult> UpdateTask(long clubId, long goalId, long taskId,
        [FromBody] GroupGoalTaskInputDto dto)
    {
        if (UserId is not long userId)
            return Unauthorized();

        if (!await IsManager(clubId, userId))
            return Forbid();

        var goal = await _db.GroupGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.ClubId == clubId);

        if (goal == null)
            return NotFound();

        if (goal.Status is "completed" or "cancelled")
            return BadRequest(new { message = "Ціль закрита для змін." });

        var task = await _db.GroupGoalTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.GroupGoalId == goalId);

        if (task == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Вкажіть назву завдання." });

        if (dto.DueDate is not DateOnly dueDate)
            return BadRequest(new { message = "Вкажіть дату виконання завдання." });

        if (dueDate < goal.StartDate || dueDate > goal.EndDate)
            return BadRequest(new { message = "Дата завдання повинна належати періоду групової цілі." });

        if (await _db.GroupGoalTaskSubmissions.AnyAsync(s => s.GroupGoalTaskId == taskId))
            return Conflict(new { message = "Неможливо редагувати завдання, для якого вже надіслано звіти." });

        task.Title = dto.Title.Trim();
        task.Description = dto.Description?.Trim();
        task.SortOrder = dto.SortOrder;
        task.DueDate = dueDate;
        task.ReviewCriteria = dto.ReviewCriteria?.Trim();
        task.RequiresAttachment = dto.RequiresAttachment;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            task.Id,
            task.GroupGoalId,
            task.Title,
            task.Description,
            task.SortOrder,
            task.DueDate,
            task.ReviewCriteria,
            task.RequiresAttachment
        });
    }

    [HttpDelete("{taskId:long}")]
    public async Task<IActionResult> DeleteTask(long clubId, long goalId, long taskId)
    {
        if (UserId is not long userId)
            return Unauthorized();

        if (!await IsManager(clubId, userId))
            return Forbid();

        var goal = await _db.GroupGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.ClubId == clubId);

        if (goal == null)
            return NotFound();

        if (goal.Status is "completed" or "cancelled")
            return BadRequest(new { message = "Ціль закрита для змін." });

        var task = await _db.GroupGoalTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.GroupGoalId == goalId);

        if (task == null)
            return NotFound();
        if (await _db.GroupGoalTaskSubmissions.AnyAsync(s => s.GroupGoalTaskId == taskId))
            return Conflict(new { message = "Неможливо видалити завдання, для якого вже надіслано звіти." });

        var completions = await _db.GroupGoalTaskCompletions.Where(c => c.GroupGoalTaskId == taskId).ToListAsync();

        await using var transaction = await _db.Database.BeginTransactionAsync();

        _db.GroupGoalTaskCompletions.RemoveRange(completions);
        _db.GroupGoalTasks.Remove(task);

        await _db.SaveChangesAsync();

        await _db.ClubPointTransactions.Where(p => p.ClubId == clubId && p.ActionType == "group_task" && p.SourceId == taskId).ExecuteDeleteAsync();

        await transaction.CommitAsync();

        return NoContent();
    }
}
