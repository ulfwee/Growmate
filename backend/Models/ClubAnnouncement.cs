using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_announcements")]
public class ClubAnnouncement
{
    [Key]
    public long Id { get; set; }

    public long ClubId { get; set; }

    public long AuthorId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string AnnouncementType { get; set; } = "general";

    public string? ImageUrl { get; set; }

    public long? RelatedEventId { get; set; }

    public long? RelatedGroupGoalId { get; set; }

    public bool IsPinned { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}