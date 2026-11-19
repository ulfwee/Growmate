using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("group_goals")]
public class GroupGoal
{
    public long Id { get; set; }

    public long ClubId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal TargetValue { get; set; }

    public decimal CurrentValue { get; set; } = 0;

    public string Unit { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly EndDate { get; set; }

    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(ClubId))]
    public Club Club { get; set; } = null!;

    public ICollection<GroupGoalParticipant> Participants { get; set; } = new List<GroupGoalParticipant>();

    public ICollection<Post> Posts { get; set; } = new List<Post>();
}