using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("post_reactions")]
public class PostReaction
{
    [Key]
    public long Id { get; set; }

    public long PostId { get; set; }

    public long UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string ReactionType { get; set; } = "like";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PostId))]
    public Post Post { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}