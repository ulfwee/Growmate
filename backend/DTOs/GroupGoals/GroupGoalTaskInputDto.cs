using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GroupGoals;

public class GroupGoalTaskInputDto
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int SortOrder { get; set; }

    [Required(ErrorMessage = "Вкажіть дату виконання завдання.")]
    public DateOnly? DueDate { get; set; }
}