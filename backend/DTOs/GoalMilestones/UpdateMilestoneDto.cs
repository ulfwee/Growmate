using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GoalMilestones;

public class UpdateMilestoneDto
{
    [Required(ErrorMessage = "Вкажіть назву етапу.")]
    [StringLength(200, ErrorMessage = "Назва не може перевищувати 200 символів.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly? DueDate { get; set; }
}