using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Clubs;

public class ReviewClubJoinRequestDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}