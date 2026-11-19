namespace backend.DTOs.XP;

public class LevelProgressDto
{
    public int Level { get; set; }

    public int TotalXp { get; set; }

    public int XpInLevel { get; set; }

    public int XpForNextLevel { get; set; }

    public int XpRemaining { get; set; }

    public int ProgressPercent { get; set; }
}
