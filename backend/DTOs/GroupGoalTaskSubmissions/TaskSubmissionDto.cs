namespace backend.DTOs.GroupGoalTaskSubmissions;

public class TaskSubmissionDto
{
    public long Id { get; set; }

    public long GroupGoalTaskId { get; set; }

    public string TaskTitle { get; set; } = string.Empty;

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ReportText { get; set; } = string.Empty;

    public string? EvidenceUrl { get; set; }

    public string Status { get; set; } = string.Empty;

    public int? Rating { get; set; }

    public string? ReviewComment { get; set; }

    public long? ReviewedBy { get; set; }

    public string? ReviewerUsername { get; set; }

    public DateTime SubmittedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public long GroupGoalId { get; set; }
    public List<TaskSubmissionAttachmentDto> Attachments { get; set; } = new();
}