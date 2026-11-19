namespace backend.DTOs.Interests;

public class UpdateUserInterestsDto
{
    public List<long> InterestIds { get; set; } = new();
}