namespace backend.DTOs.GroupGoals;

public class GroupGoalDto
{
    public long Id { get; set; }

    public long ClubId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal TargetValue { get; set; }

    public decimal CurrentValue { get; set; }

    public decimal Progress { get; set; }

    public string Unit { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public int ParticipantsCount { get; set; }

    public List<GroupGoalParticipantDto> Participants { get; set; } = new();
}