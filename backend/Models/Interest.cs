using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("interests")]
public class Interest
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<UserInterest> UserInterests { get; set; } = new List<UserInterest>();

    public ICollection<ClubInterest> ClubInterests { get; set; } = new List<ClubInterest>();
}