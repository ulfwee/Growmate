namespace backend.DTOs.Posts;

public class UpdatePostDto
{
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
}