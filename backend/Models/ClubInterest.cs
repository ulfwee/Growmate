using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("club_interests")]
public class ClubInterest
{
    public long ClubId { get; set; }
    public long InterestId { get; set; }

    public Club Club { get; set; } = null!;
    public Interest Interest { get; set; } = null!;
}