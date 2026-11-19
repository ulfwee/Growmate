using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Xml.Linq;
using Microsoft.Extensions.Hosting;

namespace backend.Models;

[Table("users")]
public class User
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    public string? PasswordHash { get; set; }

    [MaxLength(255)]
    public string? GoogleId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "user";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserProfile? Profile { get; set; }

    public ICollection<Club> OwnedClubs { get; set; } = new List<Club>();

    public ICollection<ClubMember> ClubMemberships { get; set; } = new List<ClubMember>();

    public ICollection<Post> Posts { get; set; } = new List<Post>();

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public ICollection<UserInterest> Interests { get; set; } = new List<UserInterest>();

    public ICollection<UserTask> Tasks { get; set; } = new List<UserTask>();

    public ICollection<PostReaction> PostReactions { get; set; } = new List<PostReaction>();

    public ICollection<UserAchievement> Achievements { get; set; } = new List<UserAchievement>();

    public ICollection<UserXpHistory> XpHistory { get; set; } = new List<UserXpHistory>();

    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
}
