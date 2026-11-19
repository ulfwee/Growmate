using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("achievements")]
public class Achievement
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public string? IconUrl { get; set; }

    public int XpReward { get; set; } = 0;

    public ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();

    [Required]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;
}