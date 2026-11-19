using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_join_requests")]
public class ClubJoinRequest
{
    [Key]
    public long Id { get; set; }

    public long ClubId { get; set; }

    public long UserId { get; set; }

    [MaxLength(1000)]
    public string? Message { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    [ForeignKey(nameof(ClubId))]
    public Club Club { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}