using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GroupGoalTaskSubmissions;

public class ReviewTaskSubmissionDto
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? ReviewComment { get; set; }
}