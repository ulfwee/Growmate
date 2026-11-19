namespace backend.DTOs.GroupGoals;

public class GroupGoalParticipantDto
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public decimal Contribution { get; set; }

    public DateTime JoinedAt { get; set; }
}