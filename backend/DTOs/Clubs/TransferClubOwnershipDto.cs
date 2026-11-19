using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Clubs;

public class TransferClubOwnershipDto
{
    [Required]
    public long NewOwnerId { get; set; }
}