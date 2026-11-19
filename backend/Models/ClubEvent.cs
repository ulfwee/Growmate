using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_events")]
public class ClubEvent
{
    [Key]
    public long Id { get; set; }

    public long ClubId { get; set; }

    public long CreatedBy { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? CoverUrl { get; set; }

    [Required]
    [MaxLength(20)]
    public string EventType { get; set; } = "online";

    public string? Location { get; set; }

    public string? MeetingUrl { get; set; }

    public DateTime StartsAt { get; set; }

    public DateTime? EndsAt { get; set; }

    public int? MaxParticipants { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ClubId))]
    public Club Club { get; set; } = null!;

    [ForeignKey(nameof(CreatedBy))]
    public User Creator { get; set; } = null!;

    public ICollection<ClubEventParticipant> Participants { get; set; } = new List<ClubEventParticipant>();
}