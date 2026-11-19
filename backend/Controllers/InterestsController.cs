using System.Security.Claims;
using backend.Data;
using backend.DTOs.Interests;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/interests")]
public class InterestsController : ControllerBase
{
    private readonly AppDBContext _context;

    public InterestsController(AppDBContext context)
    {
        _context = context;
    }

    #region Methods

    private bool TryGetUserId(out long userId)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(claim, out userId);
    }

    #endregion

    [HttpGet]
    public async Task<IActionResult> GetInterests()
    {
        var interests = await _context.Interests.AsNoTracking().OrderBy(i => i.Name)
            .Select(i => new InterestDto
            {
                Id = i.Id,
                Name = i.Name,
                Description = i.Description,
                IsSelected = false
            }).ToListAsync();

        return Ok(interests);
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyInterests()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var interests = await _context.UserInterests.AsNoTracking().Where(ui => ui.UserId == userId).OrderBy(ui => ui.Interest.Name)
            .Select(ui => new InterestDto
            {
                Id = ui.Interest.Id,
                Name = ui.Interest.Name,
                Description = ui.Interest.Description,
                IsSelected = true
            }).ToListAsync();

        return Ok(interests);
    }

    [Authorize]
    [HttpPut("my")]
    public async Task<IActionResult> UpdateMyInterests([FromBody] UpdateUserInterestsDto dto)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (dto?.InterestIds == null) return BadRequest(new { message = "Необхідно передати список інтересів." });

        var interestIds = dto.InterestIds.Distinct().ToList();
        if (interestIds.Count > 5) return BadRequest(new { message = "Можна обрати не більше 5 інтересів." });

        var existingIds = await _context.Interests.Where(i => interestIds.Contains(i.Id)).Select(i => i.Id).ToListAsync();
        if (existingIds.Count != interestIds.Count) return BadRequest(new { message = "Один або декілька інтересів не існують." });

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var currentInterests = await _context.UserInterests.Where(ui => ui.UserId == userId).ToListAsync();
            _context.UserInterests.RemoveRange(currentInterests);

            var newInterests = interestIds.Select(id => new UserInterest
            {
                UserId = userId,
                InterestId = id
            });

            await _context.UserInterests.AddRangeAsync(newInterests);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Інтереси успішно оновлено.", interestIds });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
