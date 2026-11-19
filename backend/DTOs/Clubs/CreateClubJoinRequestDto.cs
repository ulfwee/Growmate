using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Clubs;

public class CreateClubJoinRequestDto
{
    [StringLength(1000)]
    public string? Message { get; set; }
}