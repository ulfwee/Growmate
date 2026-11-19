using System.ComponentModel.DataAnnotations.Schema;
namespace backend.Models;

[Table("goals")]
public class Goal
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly? Deadline { get; set; }

    public string Status { get; set; } = "active";

    public decimal Progress { get; set; } = 0;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    public ICollection<GoalMilestone> Milestones { get; set; } = new List<GoalMilestone>();

    public ICollection<Post> Posts { get; set; } = new List<Post>();

    public ICollection<UserTask> Tasks { get; set; } = new List<UserTask>();
}