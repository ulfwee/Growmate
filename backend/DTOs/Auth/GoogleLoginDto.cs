using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Auth;

public class GoogleLoginDto
{
    [Required]
    public string Credential { get; set; } = string.Empty;
}