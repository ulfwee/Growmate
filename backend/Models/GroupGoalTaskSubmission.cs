using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("group_goal_task_submissions")]
public class GroupGoalTaskSubmission
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("group_goal_task_id")]
    public long GroupGoalTaskId { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }

    [Required]
    [Column("report_text")]
    public string ReportText { get; set; } = string.Empty;

    [Column("evidence_url")]
    public string? EvidenceUrl { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("rating")]
    public int? Rating { get; set; }

    [Column("review_comment")]
    public string? ReviewComment { get; set; }

    [Column("reviewed_by")]
    public long? ReviewedBy { get; set; }

    [Column("submitted_at")]
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [Column("reviewed_at")]
    public DateTime? ReviewedAt { get; set; }

    public GroupGoalTask GroupGoalTask { get; set; } = null!;

    public User User { get; set; } = null!;

    public User? Reviewer { get; set; }

    public ICollection<TaskSubmissionAttachment> Attachments { get; set; } = new List<TaskSubmissionAttachment>();
}