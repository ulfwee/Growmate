using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("user_achievements")]
public class UserAchievement
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }

    public long AchievementId { get; set; }

    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(AchievementId))]
    public Achievement Achievement { get; set; } = null!;
}