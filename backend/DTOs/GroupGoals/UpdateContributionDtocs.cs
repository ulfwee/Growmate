using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.GroupGoals;

public class UpdateContributionDto
{
    [Range(typeof(decimal), "0", "9999999999")]
    public decimal Contribution { get; set; }
}