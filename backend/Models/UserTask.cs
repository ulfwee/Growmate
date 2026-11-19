using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("tasks")]
public class UserTask
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }

    public long? GoalId { get; set; }

    public long? MilestoneId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }
    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "medium";

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public bool IsRecurring { get; set; } = false;

    [MaxLength(100)]
    public string? RecurrenceRule { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(GoalId))]
    public Goal? Goal { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public GoalMilestone? Milestone { get; set; }

    public ICollection<TaskOccurrence> Occurrences { get; set; } = new List<TaskOccurrence>();
}