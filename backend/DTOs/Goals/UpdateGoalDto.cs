using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Goals;

public class UpdateGoalDto
{
    [Required(ErrorMessage = "Вкажіть назву цілі.")]
    [StringLength(200, ErrorMessage = "Назва не може перевищувати 200 символів.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? Deadline { get; set; }

    public string Status { get; set; } = "active";
}