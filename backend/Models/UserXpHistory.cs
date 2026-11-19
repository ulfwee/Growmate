using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("user_xp_history")]
public class UserXpHistory
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }

    public int XpAmount { get; set; }

    [Required]
    [MaxLength(255)]
    public string Reason { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}