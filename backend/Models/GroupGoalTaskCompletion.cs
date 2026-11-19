using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("group_goal_task_completions")]
public class GroupGoalTaskCompletion
{
    [Key]
    public long Id { get; set; }

    public long GroupGoalTaskId { get; set; }

    public long UserId { get; set; }

    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}