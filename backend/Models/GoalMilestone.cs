using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("goal_milestones")]
public class GoalMilestone
{
    public long Id { get; set; }

    public long GoalId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly? DueDate { get; set; }

    public decimal Progress { get; set; } = 0;

    public bool IsCompleted { get; set; } = false;

    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(GoalId))]
    public Goal Goal { get; set; } = null!;

    public ICollection<UserTask> Tasks { get; set; } = new List<UserTask>();
}