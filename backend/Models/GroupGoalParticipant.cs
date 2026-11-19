using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("group_goal_participants")]
public class GroupGoalParticipant
{
    public long Id { get; set; }

    public long GroupGoalId { get; set; }

    public long UserId { get; set; }

    public decimal Contribution { get; set; } = 0;

    public DateTime JoinedAt { get; set; }

    [ForeignKey(nameof(GroupGoalId))]
    public GroupGoal GroupGoal { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}