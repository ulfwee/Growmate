namespace backend.DTOs.XP;

public class UserXpStatsDto
{
    public int TotalXp { get; set; }

    public int CurrentStreak { get; set; }

    public int LongestStreak { get; set; }

    public int AchievementsCount { get; set; }

    public int CompletedGoalsCount { get; set; }

    public int CompletedTasksCount { get; set; }

    public int Level { get; set; }

    public int XpInLevel { get; set; }

    public int XpForNextLevel { get; set; }

    public int XpRemaining { get; set; }

    public int LevelProgressPercent { get; set; }

    public bool IsStreakActiveToday { get; set; }
}