using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("task_submission_attachments")]
public class TaskSubmissionAttachment
{
    [Key, Column("id")]
    public long Id { get; set; }
    [Column("submission_id")]
    public long SubmissionId { get; set; }
    [Required, Column("file_url")]
    public string FileUrl { get; set; } = string.Empty;
    [Required, MaxLength(255), Column("file_name")]
    public string FileName { get; set; } = string.Empty;
    [Required, MaxLength(150), Column("content_type")]
    public string ContentType { get; set; } = string.Empty;
    [Column("file_size")]
    public long FileSize { get; set; }
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("file_data", TypeName = "bytea")]
    public byte[] FileData { get; set; } = Array.Empty<byte>();
    public GroupGoalTaskSubmission Submission { get; set; } = null!;
}
