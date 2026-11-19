using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_members")]
public class ClubMember
{
    [Key]
    public long Id { get; set; }

    public long ClubId { get; set; }

    public long UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "member";

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "active";

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ClubId))]
    public Club Club { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}