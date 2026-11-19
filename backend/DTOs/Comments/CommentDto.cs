namespace backend.DTOs.Comments;

public class CommentDto
{
    public long Id { get; set; }

    public long PostId { get; set; }

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}