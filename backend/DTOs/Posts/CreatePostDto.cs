namespace backend.DTOs.Posts;

public class CreatePostDto
{
    public long? ClubId { get; set; }

    public long? GoalId { get; set; }

    public long? GroupGoalId { get; set; }

    public string PostType { get; set; } = "report";

    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
}