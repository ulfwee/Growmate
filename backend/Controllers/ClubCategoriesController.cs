using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClubCategoriesController : ControllerBase
{
    private readonly AppDBContext _context;

    public ClubCategoriesController(AppDBContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.ClubCategories.AsNoTracking().OrderBy(c => c.Name).Select(c => new
        {
            c.Id,
            c.Name,
            c.Description,
            c.IconUrl
        }).ToListAsync();

        return Ok(categories);
    }
}