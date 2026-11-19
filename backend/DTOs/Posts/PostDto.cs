namespace backend.DTOs.Posts;
public class PostDto
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public long? ClubId { get; set; }

    public long? GoalId { get; set; }

    public long? GroupGoalId { get; set; }

    public string PostType { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public int CommentsCount { get; set; }

    public int ReactionsCount { get; set; }

    public string? MyReaction { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}