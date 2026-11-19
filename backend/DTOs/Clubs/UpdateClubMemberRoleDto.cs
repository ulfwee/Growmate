using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Clubs;

public class UpdateClubMemberRoleDto
{
    [Required]
    [RegularExpression("^(admin|member)$", ErrorMessage = "Роль має бути admin або member.")]
    public string Role { get; set; } = "member";
}