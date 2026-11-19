using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Growmate.Tests.Integration;

public class GoalDateValidationIntegrationTests
{
    private static AppDBContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDBContext(options);
    }

    [Fact]
    public async Task ValidMilestoneDate_ShouldReturnNull()
    {
        using var context = CreateContext();

        context.Goals.Add(new Goal
        {
            Id = 1,
            Title = "Вивчити React",
            StartDate = new DateOnly(2026, 11, 1),
            Deadline = new DateOnly(2026, 12, 31)
        });

        await context.SaveChangesAsync();

        var service = new GoalDateValidationService(context);

        var result = await service.ValidateMilestoneAsync(
            1,
            new DateOnly(2026, 11, 20)
        );

        Assert.Null(result);
    }

    [Fact]
    public async Task MilestoneAfterDeadline_ShouldReturnError()
    {
        using var context = CreateContext();

        context.Goals.Add(new Goal
        {
            Id = 1,
            Title = "Вивчити React",
            StartDate = new DateOnly(2026, 11, 1),
            Deadline = new DateOnly(2026, 11, 30)
        });

        await context.SaveChangesAsync();

        var service = new GoalDateValidationService(context);

        var result = await service.ValidateMilestoneAsync(
            1,
            new DateOnly(2026, 12, 10)
        );

        Assert.Equal(
            "Дата завершення етапу не може бути пізніше дедлайну основної цілі.",
            result
        );
    }

    [Fact]
    public async Task MissingGoal_ShouldReturnError()
    {
        using var context = CreateContext();

        var service = new GoalDateValidationService(context);

        var result = await service.ValidateMilestoneAsync(
            999,
            new DateOnly(2026, 11, 20)
        );

        Assert.Equal("Ціль не знайдено.", result);
    }
}
