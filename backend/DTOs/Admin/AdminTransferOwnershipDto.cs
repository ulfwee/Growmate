using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Admin;

public class AdminTransferOwnershipDto
{
    [Required]
    [Range(1, long.MaxValue)]
    public long NewOwnerId { get; set; }
}