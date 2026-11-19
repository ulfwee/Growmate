using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("user_interests")]
public class UserInterest
{
    public long UserId { get; set; }

    public long InterestId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(InterestId))]
    public Interest Interest { get; set; } = null!;
}