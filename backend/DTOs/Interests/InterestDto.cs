namespace backend.DTOs.Interests;

public class InterestDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsSelected { get; set; }
}