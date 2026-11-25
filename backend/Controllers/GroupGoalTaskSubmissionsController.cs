using System.Security.Claims;
using backend.Data;
using backend.DTOs.GroupGoalTaskSubmissions;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs/{clubId:long}/group-goals/{goalId:long}/tasks")]
public class GroupGoalTaskSubmissionsController : ControllerBase
{
    private readonly AppDBContext _db;
    private readonly ClubRatingService _rating;
    private readonly GamificationService _gamification;
    private readonly NotificationDispatcher _notifications;

    public GroupGoalTaskSubmissionsController(AppDBContext db, ClubRatingService rating,
        GamificationService gamification, NotificationDispatcher notifications)
    {
        _db = db;
        _rating = rating;
        _gamification = gamification;
        _notifications = notifications;
    }

    private long? UserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private IQueryable<ClubMember> Managers(long clubId) => _db.ClubMembers.Where(m =>
        m.ClubId == clubId && m.Status == "active" &&
        (m.Role == "owner" || m.Role == "admin" || m.Role == "moderator"));
    private Task<bool> IsManager(long clubId, long userId) => Managers(clubId).AnyAsync(m => m.UserId == userId);
    private Task<bool> IsMember(long clubId, long userId) => _db.ClubMembers.AnyAsync(m => m.ClubId == clubId && m.UserId == userId && m.Status == "active");
    private Task<bool> IsParticipant(long goalId, long userId) => _db.GroupGoalParticipants.AnyAsync(p => p.GroupGoalId == goalId && p.UserId == userId);
    private IQueryable<GroupGoalTaskSubmission> Submissions(long clubId, long goalId) =>
        _db.GroupGoalTaskSubmissions.Where(s => s.GroupGoalTask.GroupGoalId == goalId &&
            _db.GroupGoals.Any(g => g.Id == goalId && g.ClubId == clubId));

    private static IQueryable<TaskSubmissionDto> Project(IQueryable<GroupGoalTaskSubmission> query) => query.Select(s => new TaskSubmissionDto
    {
        Id = s.Id,
        GroupGoalTaskId = s.GroupGoalTaskId,
        TaskTitle = s.GroupGoalTask.Title,
        UserId = s.UserId,
        Username = s.User.Username,
        AvatarUrl = s.User.Profile == null ? null : s.User.Profile.AvatarUrl,
        ReportText = s.ReportText,
        EvidenceUrl = s.EvidenceUrl,
        Status = s.Status,
        Rating = s.Rating,
        ReviewComment = s.ReviewComment,
        ReviewedBy = s.ReviewedBy,
        ReviewerUsername = s.Reviewer == null ? null : s.Reviewer.Username,
        SubmittedAt = s.SubmittedAt,
        ReviewedAt = s.ReviewedAt,
        GroupGoalId = s.GroupGoalTask.GroupGoalId,
        Attachments = s.Attachments.Select(a => new TaskSubmissionAttachmentDto
        { Id = a.Id, FileUrl = a.FileUrl, FileName = a.FileName, ContentType = a.ContentType, FileSize = a.FileSize }).ToList()
    });

    [HttpPost("{taskId:long}/submissions")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> Submit(long clubId, long goalId, long taskId, [FromForm] CreateTaskSubmissionDto dto)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsMember(clubId, userId)) return Forbid();
        var goal = await _db.GroupGoals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == goalId && g.ClubId == clubId);
        if (goal == null) return NotFound();
        if (!await IsParticipant(goalId, userId)) return Forbid();
        if (goal.Status is "completed" or "cancelled") return BadRequest(new { message = "Ціль закрита." });
        var task = await _db.GroupGoalTasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId && t.GroupGoalId == goalId);
        if (task == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.ReportText)) return BadRequest(new { message = "Вкажіть опис виконаної роботи." });
        var evidence = dto.EvidenceUrl?.Trim();
        if (!string.IsNullOrEmpty(evidence) && (!Uri.TryCreate(evidence, UriKind.Absolute, out var uri) || uri.Scheme != "https"))
            return BadRequest(new { message = "Посилання повинно використовувати HTTPS." });
        var files = dto.Attachments ?? new List<IFormFile>();
        if (task.RequiresAttachment && files.Count == 0) return BadRequest(new { message = "Прикріпіть доказ виконання." });
        if (files.Count > 3 || files.Sum(f => f.Length) > 10 * 1024 * 1024)
            return BadRequest(new { message = "Максимум 3 файли, загалом до 10 МБ." });
        if (await _db.GroupGoalTaskCompletions.AnyAsync(c => c.GroupGoalTaskId == taskId && c.UserId == userId) ||
            await Submissions(clubId, goalId).AnyAsync(s => s.GroupGoalTaskId == taskId && s.UserId == userId && (s.Status == "pending" || s.Status == "approved")))
            return Conflict(new { message = "Завдання вже виконано або очікує перевірки." });
        var managers = await Managers(clubId).Where(m => m.UserId != userId).Select(m => m.UserId).Distinct().ToListAsync();
        if (managers.Count == 0) return Conflict(new { message = "Немає іншого уповноваженого учасника для перевірки." });
        var submission = new GroupGoalTaskSubmission
        {
            GroupGoalTaskId = taskId,
            UserId = userId,
            ReportText = dto.ReportText.Trim(),
            EvidenceUrl = string.IsNullOrEmpty(evidence) ? null : evidence
        };
        foreach (var file in files)
        {
            if (file.Length <= 0 || file.Length > 5 * 1024 * 1024) return BadRequest(new { message = "Розмір одного файлу: до 5 МБ." });
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            var bytes = stream.ToArray();
            var type = DetectType(bytes);
            if (type == null) return BadRequest(new { message = "Дозволено лише PNG, JPEG та PDF." });
            var name = Path.GetFileName(file.FileName.Replace('\\', '/'));
            if (string.IsNullOrWhiteSpace(name) || name.Length > 255) return BadRequest(new { message = "Некоректна назва файлу." });
            var key = Guid.NewGuid().ToString("N");
            var attachment = new TaskSubmissionAttachment
            {
                FileName = name,
                ContentType = type,
                FileSize = bytes.LongLength,
                FileUrl = $"/api/clubs/{clubId}/group-goals/{goalId}/tasks/attachments/{key}",
                FileData = bytes
            };
            submission.Attachments.Add(attachment);
        }
        _db.GroupGoalTaskSubmissions.Add(submission);
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        { return Conflict(new { message = "Звіт уже існує." }); }
        foreach (var manager in managers)
            await _notifications.ToUserAsync(manager, "task_submission", "Новий звіт на перевірку", $"Надіслано звіт для завдання «{task.Title}».", $"/clubs/{clubId}/group-goals/{goalId}");
        return Ok(await Project(Submissions(clubId, goalId).Where(s => s.Id == submission.Id)).SingleAsync());
    }

    private static string? DetectType(byte[] b)
    {
        if (b.Length >= 8 && b.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return "image/png";
        if (b.Length >= 3 && b[0] == 255 && b[1] == 216 && b[2] == 255) return "image/jpeg";
        if (b.Length >= 5 && b.Take(5).SequenceEqual(new byte[] { 37, 80, 68, 70, 45 })) return "application/pdf";
        return null;
    }

    [HttpGet("{taskId:long}/submissions/my")]
    public async Task<IActionResult> MySubmissions(long clubId, long goalId, long taskId)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsMember(clubId, userId)) return Forbid();
        return Ok(await Project(Submissions(clubId, goalId).AsNoTracking().Where(s => s.GroupGoalTaskId == taskId && s.UserId == userId).OrderByDescending(s => s.SubmittedAt)).ToListAsync());
    }

    [HttpGet("{taskId:long}/submissions")]
    public async Task<IActionResult> GetSubmissions(long clubId, long goalId, long taskId)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsManager(clubId, userId)) return Forbid();
        return Ok(await Project(Submissions(clubId, goalId).AsNoTracking().Where(s => s.GroupGoalTaskId == taskId).OrderByDescending(s => s.SubmittedAt)).ToListAsync());
    }

    [HttpGet("/api/clubs/{clubId:long}/task-submissions/pending")]
    public async Task<IActionResult> Pending(long clubId)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsManager(clubId, userId)) return Forbid();
        return Ok(await Project(_db.GroupGoalTaskSubmissions.AsNoTracking().Where(s => s.Status == "pending" &&
            _db.GroupGoals.Any(g => g.Id == s.GroupGoalTask.GroupGoalId && g.ClubId == clubId)).OrderBy(s => s.SubmittedAt)).ToListAsync());
    }

    [HttpGet("submissions/{submissionId:long}")]
    public async Task<IActionResult> GetSubmission(long clubId, long goalId, long submissionId)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsMember(clubId, userId)) return Forbid();
        var manager = await IsManager(clubId, userId);
        var result = await Project(Submissions(clubId, goalId).AsNoTracking().Where(s => s.Id == submissionId && (manager || s.UserId == userId))).SingleOrDefaultAsync();
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("attachments/{key}")]
    public async Task<IActionResult> Download(long clubId, long goalId, string key)
    {
        if (UserId is not long userId) return Unauthorized();
        if (!await IsMember(clubId, userId)) return Forbid();
        if (!Guid.TryParseExact(key, "N", out _)) return NotFound();
        var manager = await IsManager(clubId, userId);
        var url = $"/api/clubs/{clubId}/group-goals/{goalId}/tasks/attachments/{key}";
        var file = await Submissions(clubId, goalId).Where(s => manager || s.UserId == userId)
            .SelectMany(s => s.Attachments).Where(a => a.FileUrl == url)
            .Select(a => new { a.FileData, a.FileName }).SingleOrDefaultAsync();
        if (file == null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.FileData, "application/octet-stream", file.FileName);
    }

    [HttpPatch("submissions/{submissionId:long}/review")]
    public async Task<IActionResult> Review(long clubId, long goalId, long submissionId, [FromBody] ReviewTaskSubmissionDto dto)
    {
        if (UserId is not long reviewerId) return Unauthorized();
        if (!await IsManager(clubId, reviewerId)) return Forbid();
        if (dto.Rating is < 1 or > 5) return BadRequest();
        var approved = dto.Rating >= 3;
        if (!approved && string.IsNullOrWhiteSpace(dto.ReviewComment)) return BadRequest(new { message = "Вкажіть причину відхилення." });
        var submission = await Submissions(clubId, goalId).AsNoTracking().SingleOrDefaultAsync(s => s.Id == submissionId);
        if (submission == null) return NotFound();
        if (submission.UserId == reviewerId) return Forbid();
        if (!await IsMember(clubId, submission.UserId) || !await IsParticipant(goalId, submission.UserId)) return Conflict(new { message = "Автор більше не бере участі в цілі." });
        if (!await _db.GroupGoals.AnyAsync(g => g.Id == goalId && g.ClubId == clubId && g.Status != "completed" && g.Status != "cancelled")) return Conflict(new { message = "Ціль закрита." });
        var status = approved ? "approved" : "rejected";
        var now = DateTime.UtcNow;
        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            try
            {
                var affected = await Submissions(clubId, goalId).Where(s => s.Id == submissionId && s.Status == "pending")
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, status).SetProperty(x => x.Rating, (int?)dto.Rating)
                        .SetProperty(x => x.ReviewComment, dto.ReviewComment == null ? null : dto.ReviewComment.Trim())
                        .SetProperty(x => x.ReviewedBy, (long?)reviewerId).SetProperty(x => x.ReviewedAt, (DateTime?)now));
                if (affected == 0) return Conflict(new { message = "Звіт уже перевірено." });
                if (approved)
                {
                    if (await _db.GroupGoalTaskCompletions.AnyAsync(c => c.GroupGoalTaskId == submission.GroupGoalTaskId && c.UserId == submission.UserId))
                        return Conflict(new { message = "Завдання вже виконано." });
                    _db.GroupGoalTaskCompletions.Add(new GroupGoalTaskCompletion { GroupGoalTaskId = submission.GroupGoalTaskId, UserId = submission.UserId });
                    await _db.SaveChangesAsync();
                    await _rating.AwardGroupTaskAsync(clubId, submission.UserId, submission.GroupGoalTaskId);
                    await _gamification.AwardXpOnceAsync(submission.UserId, dto.Rating * 3, $"group_task:{clubId}:{submission.GroupGoalTaskId}");
                    await _gamification.RegisterActivityAsync(submission.UserId);
                }
                await transaction.CommitAsync();
            }
            catch { _gamification.ClearPendingNotifications(); throw; }
        }
        await _gamification.PublishPendingNotificationsAsync();
        await _notifications.ToUserAsync(submission.UserId, "task_reviewed", approved ? "Завдання схвалено" : "Завдання потребує доопрацювання", $"Оцінка: {dto.Rating}/5. {dto.ReviewComment}", $"/clubs/{clubId}/group-goals/{goalId}");
        return Ok(await Project(Submissions(clubId, goalId).Where(s => s.Id == submissionId)).SingleAsync());
    }
}
