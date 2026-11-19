namespace backend.DTOs.Clubs;

public class ClubRecommendationDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string? CoverUrl { get; set; }

    public string Visibility { get; set; } = string.Empty;

    public List<string> MatchingInterests { get; set; } = new();

    public int MatchScore { get; set; }
}