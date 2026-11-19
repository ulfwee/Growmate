using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using backend.DTOs.Goals;
using Xunit;

namespace Growmate.Tests.Unit;

public class CreateGoalDtoTests
{
    private static List<ValidationResult> Validate(
        CreateGoalDto dto)
    {
        var results = new List<ValidationResult>();

        Validator.TryValidateObject(
            dto,
            new ValidationContext(dto),
            results,
            validateAllProperties: true
        );

        return results;
    }

    [Fact]
    public void ValidTitle_ShouldPassValidation()
    {
        var dto = new CreateGoalDto
        {
            Title = "Вивчити React"
        };

        var errors = Validate(dto);

        Assert.Empty(errors);
    }

    [Fact]
    public void EmptyTitle_ShouldFailValidation()
    {
        var dto = new CreateGoalDto
        {
            Title = ""
        };

        var errors = Validate(dto);

        Assert.Contains(errors, error =>
            error.MemberNames.Contains(
                nameof(CreateGoalDto.Title)
            )
        );
    }

    [Fact]
    public void TitleLongerThan200_ShouldFailValidation()
    {
        var dto = new CreateGoalDto
        {
            Title = new string('A', 201)
        };

        var errors = Validate(dto);

        Assert.Contains(errors, error =>
            error.MemberNames.Contains(
                nameof(CreateGoalDto.Title)
            )
        );
    }
}
