using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class GoalDateValidationService
{
    private readonly AppDBContext _context;

    public GoalDateValidationService(AppDBContext context)
    {
        _context = context;
    }

    public async Task<string?> ValidateMilestoneAsync(long goalId, DateOnly? dueDate)
    {
        var goal = await _context.Goals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == goalId);
        if (goal == null)
            return "Ціль не знайдено.";
        if (!dueDate.HasValue)
            return null;
        if (dueDate.Value < goal.StartDate)
            return "Дата етапу не може бути раніше початку цілі.";
        if (goal.Deadline.HasValue && dueDate.Value > goal.Deadline.Value)
            return "Дата завершення етапу не може бути пізніше дедлайну основної цілі.";

        return null;
    }

    public async Task<string?> ValidateTaskAsync(long? goalId, long? milestoneId, DateOnly? startDate, DateOnly? endDate, DateTime? dueDate, bool isRecurring, UserTask? existingTask = null)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        if (isRecurring)
        {
            if (!startDate.HasValue || !endDate.HasValue)
                return "Для повторюваного завдання потрібно вказати дати початку та завершення.";
            if (endDate.Value < startDate.Value)
                return "Дата завершення не може бути раніше дати початку.";

            bool scheduleUnchanged = existingTask?.IsRecurring == true && existingTask.StartDate == startDate && existingTask.EndDate == endDate;
            if (startDate.Value < today && !scheduleUnchanged)
                return "Не можна створювати повторюване завдання з датою початку в минулому.";
            if (endDate.Value < today && !scheduleUnchanged)
                return "Дата завершення повторення не може бути в минулому.";
        }
        else
        {
            if (!dueDate.HasValue)
                return "Вкажіть заплановану дату виконання завдання.";

            var plannedDate = DateOnly.FromDateTime(dueDate.Value);
            bool dateUnchanged = existingTask != null && !existingTask.IsRecurring && existingTask.DueDate == dueDate;
            if (plannedDate < today && !dateUnchanged)
                return "Не можна планувати завдання на минулу дату.";
        }

        var effectiveEnd = isRecurring ? endDate : dueDate.HasValue ? DateOnly.FromDateTime(dueDate.Value) : null;

        if (goalId.HasValue)
        {
            var goal = await _context.Goals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == goalId.Value);
            if (goal == null)
                return "Ціль не знайдено.";
            if (startDate.HasValue && startDate.Value < goal.StartDate)
                return "Завдання не може починатися раніше основної цілі.";
            if (effectiveEnd.HasValue && effectiveEnd.Value < goal.StartDate)
                return "Дата виконання завдання не може бути раніше початку основної цілі.";
            if (goal.Deadline.HasValue && effectiveEnd.HasValue && effectiveEnd.Value > goal.Deadline.Value)
                return "Запланована дата виконання виходить за дедлайн основної цілі.";
        }

        if (milestoneId.HasValue)
        {
            var milestone = await _context.GoalMilestones.AsNoTracking().FirstOrDefaultAsync(m => m.Id == milestoneId.Value);
            if (milestone == null)
                return "Проміжний етап не знайдено.";
            if (!goalId.HasValue || milestone.GoalId != goalId.Value)
                return "Проміжний етап не належить вибраній цілі.";

            if (milestone.DueDate.HasValue)
            {
                if (startDate.HasValue && startDate.Value > milestone.DueDate.Value)
                    return "Завдання не може починатися після завершення етапу.";
                if (effectiveEnd.HasValue && effectiveEnd.Value > milestone.DueDate.Value)
                    return "Запланована дата виконання виходить за дедлайн етапу.";
            }
        }

        return null;
    }

    public async Task<string?> ValidateGoalUpdateAsync(long goalId, DateOnly startDate, DateOnly? deadline)
    {
        if (deadline.HasValue && deadline.Value < startDate)
            return "Дедлайн цілі не може бути раніше початку.";

        var milestones = await _context.GoalMilestones.AsNoTracking().Where(m => m.GoalId == goalId).ToListAsync();
        foreach (var milestone in milestones)
        {
            if (milestone.DueDate.HasValue)
            {
                if (milestone.DueDate.Value < startDate)
                    return $"Етап «{milestone.Title}» завершується раніше нового початку цілі.";
                if (deadline.HasValue && milestone.DueDate.Value > deadline.Value)
                    return $"Етап «{milestone.Title}» виходить за новий дедлайн цілі.";
            }
        }

        var tasks = await _context.Tasks.AsNoTracking().Where(t => t.GoalId == goalId).ToListAsync();
        foreach (var task in tasks)
        {
            var taskStart = task.StartDate;
            var taskEnd = task.EndDate ?? (task.DueDate.HasValue ? DateOnly.FromDateTime(task.DueDate.Value) : null);

            if (taskStart.HasValue && taskStart.Value < startDate)
                return $"Завдання «{task.Title}» починається раніше нової дати початку цілі.";
            if (taskEnd.HasValue && taskEnd.Value < startDate)
                return $"Завдання «{task.Title}» завершується раніше нової дати початку цілі.";
            if (deadline.HasValue && taskEnd.HasValue && taskEnd.Value > deadline.Value)
                return $"Завдання «{task.Title}» виходить за новий дедлайн цілі.";
        }

        return null;
    }

    public async Task<string?> ValidateMilestoneUpdateAsync(long milestoneId, long goalId, DateOnly? dueDate)
    {
        var error = await ValidateMilestoneAsync(goalId, dueDate);
        if (error != null)
            return error;
        if (!dueDate.HasValue)
            return null;

        var tasks = await _context.Tasks.AsNoTracking().Where(t => t.MilestoneId == milestoneId).ToListAsync();
        foreach (var task in tasks)
        {
            var end = task.EndDate ?? (task.DueDate.HasValue ? DateOnly.FromDateTime(task.DueDate.Value) : null);
            if (task.StartDate.HasValue && task.StartDate.Value > dueDate.Value)
                return $"Завдання «{task.Title}» починається після нового дедлайну етапу.";
            if (end.HasValue && end.Value > dueDate.Value)
                return $"Завдання «{task.Title}» завершується після нового дедлайну етапу.";
        }

        return null;
    }
}