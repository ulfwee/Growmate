namespace backend.DTOs.Goals;

public class GoalDto
{
    public long Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? Deadline { get; set; }

    public string Status { get; set; } = string.Empty;

    public decimal Progress { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}