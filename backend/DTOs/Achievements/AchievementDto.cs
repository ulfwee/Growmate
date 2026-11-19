namespace backend.DTOs.Achievements;

public class AchievementDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? IconUrl { get; set; }

    public int XpReward { get; set; }

    public bool IsEarned { get; set; }

    public DateTime? EarnedAt { get; set; }
}