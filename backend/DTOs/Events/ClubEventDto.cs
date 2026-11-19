namespace backend.DTOs.Events;

public class ClubEventDto
{
    public long Id { get; set; }

    public long ClubId { get; set; }

    public string ClubName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? CoverUrl { get; set; }

    public string EventType { get; set; } = "online";

    public string? Location { get; set; }

    public string? MeetingUrl { get; set; }

    public DateTime StartsAt { get; set; }

    public DateTime? EndsAt { get; set; }

    public int? MaxParticipants { get; set; }

    public int ParticipantsCount { get; set; }

    public bool IsClubMember { get; set; }

    public bool IsParticipant { get; set; }

    public bool CanManage { get; set; }

    public DateTime CreatedAt { get; set; }
}