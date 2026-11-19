namespace backend.DTOs.Auth;

public class UserProfileDto
{
    public long Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? AvatarUrl { get; set; }

    public string? Bio { get; set; }

    public DateOnly? BirthDate { get; set; }

    public int TotalXp { get; set; }

    public int CurrentStreak { get; set; }

    public int LongestStreak { get; set; }

    public DateTime CreatedAt { get; set; }
}