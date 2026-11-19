using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs.Clubs;

namespace backend.Controllers;

[ApiController]
[Route("api/club-covers")]
[Authorize]
public class ClubCoversController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public ClubCoversController(IWebHostEnvironment environment) => _environment = environment;

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024 + 1024 * 64)]
    public async Task<IActionResult> Upload([FromForm] UploadClubCoverDto dto)
    {
        var file = dto.File;
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Оберіть зображення." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Максимальний розмір — 5 МБ." });

        var types = new Dictionary<string, (string Ext, byte[] Signature)>
        {
            ["image/jpeg"] = (".jpg", new byte[] { 0xFF, 0xD8, 0xFF }),
            ["image/png"] = (".png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ["image/webp"] = (".webp", new byte[] { 0x52, 0x49, 0x46, 0x46 })
        };

        if (!types.TryGetValue(file.ContentType.ToLowerInvariant(), out var type))
            return BadRequest(new { message = "Дозволені лише JPG, PNG і WebP." });

        await using var input = file.OpenReadStream();
        var header = new byte[12];
        if (await input.ReadAsync(header.AsMemory()) < 12 || !header.AsSpan().StartsWith(type.Signature) || (type.Ext == ".webp" && System.Text.Encoding.ASCII.GetString(header, 8, 4) != "WEBP"))
            return BadRequest(new { message = "Некоректний файл зображення." });

        var root = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var folder = Path.Combine(root, "uploads", "clubs");
        Directory.CreateDirectory(folder);

        var filename = $"{Guid.NewGuid():N}{type.Ext}";
        var destination = Path.Combine(folder, filename);
        input.Position = 0;

        await using (var output = System.IO.File.Create(destination))
            await input.CopyToAsync(output);

        return Ok(new { url = $"{Request.Scheme}://{Request.Host}/uploads/clubs/{filename}" });
    }
}