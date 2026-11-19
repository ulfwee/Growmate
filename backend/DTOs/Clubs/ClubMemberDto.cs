namespace backend.DTOs.Clubs;

public class ClubMemberDto
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? AvatarUrl { get; set; }

    public string Role { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }
}