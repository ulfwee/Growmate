using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_event_participants")]
public class ClubEventParticipant
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [Column("event_id")]
    public long EventId { get; set; }

    [Required]
    [Column("user_id")]
    public long UserId { get; set; }

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(EventId))]
    public ClubEvent Event { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}