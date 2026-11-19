namespace backend.DTOs.Auth;

public class UpdateProfileWithAvatarDto
{
    public string Username { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Bio { get; set; }

    public DateOnly? BirthDate { get; set; }

    public IFormFile? Avatar { get; set; }
}