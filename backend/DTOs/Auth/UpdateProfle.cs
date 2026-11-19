namespace backend.DTOs.Auth;

public class UpdateProfileDto
{
    public string Username { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? AvatarUrl { get; set; }

    public string? Bio { get; set; }

    public DateOnly? BirthDate { get; set; }
}