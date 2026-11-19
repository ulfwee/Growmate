using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("task_occurrences")]
public class TaskOccurrence
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    public long TaskId { get; set; }

    public DateOnly ScheduledDate { get; set; }

    public bool IsCompleted { get; set; }

    public DateTime? CompletedAt { get; set; }

    [ForeignKey(nameof(TaskId))]
    public UserTask Task { get; set; } = null!;
}