using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GroupGoals;

public class CreateGroupGoalDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(typeof(decimal), "0.01", "9999999999")]
    public decimal TargetValue { get; set; }

    [Required]
    [StringLength(50)]
    public string Unit { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [Required]
    public DateOnly EndDate { get; set; }
}