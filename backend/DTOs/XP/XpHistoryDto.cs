namespace backend.DTOs.XP;

public class XpHistoryDto
{
    public long Id { get; set; }

    public int XpAmount { get; set; }

    public string Reason { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}