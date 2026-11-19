namespace backend.DTOs.Tasks;

public class UserTaskDto
{
    public long Id { get; set; }

    public long? GoalId { get; set; }

    public string? GoalTitle { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }

    public string Priority { get; set; } = "medium";

    public string Status { get; set; } = "pending";

    public bool IsRecurring { get; set; }

    public string? RecurrenceRule { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public long? MilestoneId { get; set; }

    public string? MilestoneTitle { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }
}