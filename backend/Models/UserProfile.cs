using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("user_profiles")]
public class UserProfile
{
    [Key]
    [ForeignKey(nameof(User))]
    public long UserId { get; set; }

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    public string? AvatarUrl { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    public DateOnly? BirthDate { get; set; }

    public int TotalXp { get; set; } = 0;

    public int CurrentStreak { get; set; } = 0;

    public int LongestStreak { get; set; } = 0;

    public DateTime? LastActivityDate { get; set; }

    public User User { get; set; } = null!;
}
