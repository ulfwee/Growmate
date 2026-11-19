using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GroupGoals;

public class GroupGoalInputDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly EndDate { get; set; }

    public string Status { get; set; } = "active";
}