using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class TaskRecurrenceService
{
    private readonly AppDBContext _context;

    public TaskRecurrenceService(AppDBContext context)
    {
        _context = context;
    }

    public static bool IsValidRule(string? rule)
    {
        return rule is "daily" or "weekly";
    }

    public static List<DateOnly> GenerateDates(DateOnly start, DateOnly end, string rule)
    {
        if (end < start)
            throw new ArgumentException("Дата завершення раніше дати початку.");

        int interval = rule switch
        {
            "daily" => 1,
            "weekly" => 7,
            _ => throw new ArgumentException("Невідоме правило повторення.")
        };

        var dates = new List<DateOnly>();
        for (var date = start; date <= end; date = date.AddDays(interval))
            dates.Add(date);

        return dates;
    }

    public async Task GenerateOccurrencesAsync(long taskId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null || !task.IsRecurring || !task.StartDate.HasValue || !task.EndDate.HasValue || !IsValidRule(task.RecurrenceRule))
            return;

        var dates = GenerateDates(task.StartDate.Value, task.EndDate.Value, task.RecurrenceRule!);
        var existingDates = await _context.TaskOccurrences.Where(o => o.TaskId == taskId).Select(o => o.ScheduledDate).ToListAsync();
        var existing = existingDates.ToHashSet();

        foreach (var date in dates)
        {
            if (existing.Contains(date))
                continue;

            _context.TaskOccurrences.Add(new TaskOccurrence
            {
                TaskId = taskId,
                ScheduledDate = date,
                IsCompleted = false
            });
        }

        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetProgressAsync(long taskId)
    {
        var task = await _context.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            return 0;
        if (!task.IsRecurring)
            return task.Status == "completed" ? 100 : 0;

        var total = await _context.TaskOccurrences.CountAsync(o => o.TaskId == taskId);
        if (total == 0)
            return 0;

        var completed = await _context.TaskOccurrences.CountAsync(o => o.TaskId == taskId && o.IsCompleted);
        return Math.Round((decimal)completed / total * 100, 2);
    }

    public async Task<bool> SetOccurrenceCompletionAsync(long taskId, DateOnly date, bool isCompleted, long userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null || !task.IsRecurring)
            return false;

        var occurrence = await _context.TaskOccurrences.FirstOrDefaultAsync(o => o.TaskId == taskId && o.ScheduledDate == date);
        if (occurrence == null)
            return false;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (date > today)
            return false;

        occurrence.IsCompleted = isCompleted;
        occurrence.CompletedAt = isCompleted ? occurrence.CompletedAt ?? DateTime.UtcNow : null;
        await _context.SaveChangesAsync();

        var progress = await GetProgressAsync(taskId);
        if (progress == 100 && task.EndDate.HasValue && today >= task.EndDate.Value)
        {
            task.Status = "completed";
            task.CompletedAt ??= DateTime.UtcNow;
        }
        else
        {
            task.Status = "pending";
            task.CompletedAt = null;
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }
}
