namespace backend.DTOs.PostReactions;

public class PostReactionDto
{
    public long Id { get; set; }

    public long PostId { get; set; }

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ReactionType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}