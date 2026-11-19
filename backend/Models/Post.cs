using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("posts")]
public class Post
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }

    public long? ClubId { get; set; }

    public long? GoalId { get; set; }

    public long? GroupGoalId { get; set; }

    [Required]
    [MaxLength(20)]
    public string PostType { get; set; } = "update";

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ClubId))]
    public Club? Club { get; set; }

    [ForeignKey(nameof(GoalId))]
    public Goal? Goal { get; set; }

    [ForeignKey(nameof(GroupGoalId))]
    public GroupGoal? GroupGoal { get; set; }

    public ICollection<PostReaction> Reactions { get; set; } = new List<PostReaction>();

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}