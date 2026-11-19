using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Events;

public class SaveClubEventDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? CoverUrl { get; set; }

    [Required]
    public string EventType { get; set; } = "online";

    public string? Location { get; set; }

    public string? MeetingUrl { get; set; }

    [Required]
    public DateTime StartsAt { get; set; }

    public DateTime? EndsAt { get; set; }

    [Range(1, int.MaxValue)]
    public int? MaxParticipants { get; set; }

    public bool PublishAnnouncement { get; set; }
}