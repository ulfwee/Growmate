using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("group_goal_tasks")]
public class GroupGoalTask
{
    [Key]
    public long Id { get; set; }
    public long GroupGoalId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("due_date")]
    public DateOnly DueDate { get; set; }

    [Column("review_criteria")]
    public string? ReviewCriteria { get; set; }

    [Column("requires_attachment")]
    public bool RequiresAttachment { get; set; } = false;

    public ICollection<GroupGoalTaskSubmission> Submissions { get; set; } = new List<GroupGoalTaskSubmission>();
}