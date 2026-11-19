using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Announcements;

public class SaveAnnouncementDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public string AnnouncementType { get; set; } = "general";

    public string? ImageUrl { get; set; }

    public long? RelatedEventId { get; set; }

    public long? RelatedGroupGoalId { get; set; }

    public bool IsPinned { get; set; }
}