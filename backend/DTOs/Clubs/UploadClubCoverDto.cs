using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace backend.DTOs.Clubs;

public class UploadClubCoverDto
{
    [Required]
    public IFormFile File { get; set; } = null!;
}