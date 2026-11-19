namespace backend.DTOs.Tasks;

public class UpdateUserTaskDto
{
    public long? GoalId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }

    public string Priority { get; set; } = "medium";

    public bool IsRecurring { get; set; }

    public string? RecurrenceRule { get; set; }

    public string Status { get; set; } = "pending";

    public long? MilestoneId { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }
}