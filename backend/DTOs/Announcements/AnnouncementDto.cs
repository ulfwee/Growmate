namespace backend.DTOs.Announcements;

public class AnnouncementDto
{
    public long Id { get; set; }
    public long ClubId { get; set; }
    public long AuthorId { get; set; }

    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorAvatarUrl { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string AnnouncementType { get; set; } = "general";
    public string? ImageUrl { get; set; }

    public long? RelatedEventId { get; set; }
    public long? RelatedGroupGoalId { get; set; }

    public bool IsPinned { get; set; }

    public int LikesCount { get; set; }
    public bool IsLiked { get; set; }

    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool CanPin { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}