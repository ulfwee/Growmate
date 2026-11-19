namespace backend.DTOs.ClubRating;

public class ClubRatingMemberDto
{
    public int Position { get; set; }

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? AvatarUrl { get; set; }

    public int TotalPoints { get; set; }

    public int CompletedTasks { get; set; }

    public int ReportsCount { get; set; }

    public int EventsCount { get; set; }

    public bool IsCurrentUser { get; set; }
}