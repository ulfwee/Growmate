using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace backend.DTOs.GroupGoalTaskSubmissions;

public class CreateTaskSubmissionDto
{
    [Required]
    [MaxLength(5000)]
    public string ReportText { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string? EvidenceUrl { get; set; }

    public List<IFormFile> Attachments { get; set; } = new();
}