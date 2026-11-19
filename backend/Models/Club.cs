using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("clubs")]
public class Club
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public long OwnerId { get; set; }

    public string? CoverUrl { get; set; }

    [Required]
    [MaxLength(20)]
    public string Visibility { get; set; } = "public";

    public string? Rules { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CategoryId))]
    public ClubCategory Category { get; set; } = null!;

    [ForeignKey(nameof(OwnerId))]
    public User Owner { get; set; } = null!;

    public ICollection<ClubMember> Members { get; set; } = new List<ClubMember>();

    public ICollection<Post> Posts { get; set; } = new List<Post>();

    public ICollection<ClubJoinRequest> JoinRequests { get; set; } = new List<ClubJoinRequest>();

    public ICollection<GroupGoal> GroupGoals { get; set; } = new List<GroupGoal>();

    public ICollection<ClubInterest> Interests { get; set; } = new List<ClubInterest>();

    public ICollection<ClubEvent> Events { get; set; } = new List<ClubEvent>();
}