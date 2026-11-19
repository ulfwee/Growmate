using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_point_transactions")]
public class ClubPointTransaction
{
    [Key]
    public long Id { get; set; }

    public long ClubId { get; set; }

    public long UserId { get; set; }

    [Required]
    [MaxLength(30)]
    public string ActionType { get; set; } = string.Empty;

    public long SourceId { get; set; }

    public int Points { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ClubId))]
    public Club Club { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}