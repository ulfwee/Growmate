namespace backend.DTOs.ClubRating;

public class ClubRatingDto
{
    public long ClubId { get; set; }

    public int MembersCount { get; set; }

    public List<ClubRatingMemberDto> Members { get; set; } = new();
}