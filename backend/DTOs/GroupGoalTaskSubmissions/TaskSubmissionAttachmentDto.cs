namespace backend.DTOs.GroupGoalTaskSubmissions;

public class TaskSubmissionAttachmentDto
{
    public long Id { get; set; }

    public string FileUrl { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }
}