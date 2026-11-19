using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_announcement_likes")]
public class ClubAnnouncementLike
{
    [Key]
    public long Id { get; set; }

    public long AnnouncementId { get; set; }

    public long UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}