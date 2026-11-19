using backend.Data;
using backend.DTOs.Clubs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class ClubRecommendationService
{
    private readonly AppDBContext _context;

    public ClubRecommendationService(AppDBContext context)
    {
        _context = context;
    }

    public async Task<List<ClubRecommendationDto>> GetRecommendationsAsync(long userId)
    {
        var userInterestIds = await _context.UserInterests.AsNoTracking().Where(ui => ui.UserId == userId).Select(ui => ui.InterestId).ToListAsync();

        if (userInterestIds.Count == 0)
            return new List<ClubRecommendationDto>();

        var userInterestNames = await _context.Interests.AsNoTracking().Where(i => userInterestIds.Contains(i.Id)).Select(i => i.Name.ToLower()).ToListAsync();

        var clubs = await _context.Clubs.AsNoTracking()
            .Where(c => !_context.ClubMembers.Any(cm => cm.ClubId == c.Id && cm.UserId == userId && (cm.Status == "active" || cm.Status == "blocked")))
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.CoverUrl,
                c.Visibility,
                CategoryName = c.Category.Name,
                MatchingInterests = c.Interests.Where(ci => userInterestIds.Contains(ci.InterestId)).Select(ci => ci.Interest.Name).ToList()
            }).ToListAsync();

        var recommendations = clubs.Select(c =>
        {
            var categoryMatches = !string.IsNullOrWhiteSpace(c.CategoryName) && userInterestNames.Contains(c.CategoryName.ToLower());
            var score = c.MatchingInterests.Count * 10 + (categoryMatches ? 5 : 0);

            return new ClubRecommendationDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                CategoryName = c.CategoryName,
                CoverUrl = c.CoverUrl,
                Visibility = c.Visibility,
                MatchingInterests = c.MatchingInterests,
                MatchScore = score
            };
        })
            .Where(c => c.MatchScore > 0).OrderByDescending(c => c.MatchScore).ToList();

        return recommendations;
    }
}