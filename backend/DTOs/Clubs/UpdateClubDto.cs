using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Clubs;

public class UpdateClubDto
{
    [Required]
    [StringLength(150, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public long CategoryId { get; set; }

    public string? CoverUrl { get; set; }

    [Required]
    public string Visibility { get; set; } = "public";

    public string? Rules { get; set; }

    public List<long> InterestIds { get; set; } = new();
}