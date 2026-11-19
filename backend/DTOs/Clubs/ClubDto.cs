namespace backend.DTOs.Clubs;

public class ClubDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public long OwnerId { get; set; }

    public string? CoverUrl { get; set; }

    public string Visibility { get; set; } = string.Empty;

    public string? Rules { get; set; }

    public int MembersCount { get; set; }

    public bool IsMember { get; set; }

    public bool IsOwner { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? MyRole { get; set; }
}