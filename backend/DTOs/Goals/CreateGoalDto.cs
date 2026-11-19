using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Goals;

public class CreateGoalDto
{
    [Required(ErrorMessage = "Вкажіть назву цілі.")]
    [StringLength(200, ErrorMessage = "Назва не може перевищувати 200 символів.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly? Deadline { get; set; }
}