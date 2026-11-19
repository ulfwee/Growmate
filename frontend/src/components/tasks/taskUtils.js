export const PRIORITIES = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
};

export const STATUS_LABELS = {
  pending: 'Очікує',
  in_progress: 'У процесі',
  completed: 'Виконано',
  cancelled: 'Скасовано',
};

export const REPEAT_LABELS = {
  daily: 'Щодня',
  weekly: 'Щотижня',
};

export const TABS = [
  { id: 'today', label: 'Сьогодні' },
  { id: 'future', label: 'Майбутні' },
  { id: 'completed', label: 'Завершені' },
  { id: 'overdue', label: 'Прострочені' },
  { id: 'all', label: 'Усі' },
];

export function dateKey(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const pad = value =>
    String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
}

export function todayKey() {
  return dateKey(new Date());
}

export function formatDate(value) {
  const key = dateKey(value);

  if (!key) return 'Без дати';

  const date = new Date(`${key}T00:00:00`);

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const pad = n =>
    String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
}

export function getDeadline(goal, milestone) {
  const dates = [
    dateKey(goal?.deadline),
    dateKey(milestone?.dueDate),
  ].filter(Boolean);

  return dates.length
    ? dates.sort()[0]
    : '';
}

export function normalizeOccurrences(data) {
  const occurrences = Array.isArray(data)
    ? data
    : Array.isArray(data?.occurrences)
      ? data.occurrences
      : [];

  return [...occurrences].sort((a, b) =>
    dateKey(a.scheduledDate).localeCompare(
      dateKey(b.scheduledDate)
    )
  );
}

export function isTaskCompleted(task) {
  if (task.source === 'group') {
    return Boolean(task.isCompleted);
  }

  return task.status === 'completed';
}

export function isTaskOverdue(task) {
  if (isTaskCompleted(task)) return false;

  if (task.status === 'cancelled') return false;

  const today = todayKey();

  if (task.isRecurring) {
    const end = dateKey(task.endDate);
    return Boolean(end && end < today);
  }

  const due = dateKey(task.dueDate);

  return Boolean(due && due < today);
}

export function getTab(task) {
  if (isTaskCompleted(task)) {
    return 'completed';
  }

  const today = todayKey();

  if (task.isRecurring) {
    const start = dateKey(task.startDate);
    const end = dateKey(task.endDate);

    if (start && start > today) {
      return 'future';
    }

    if (end && end < today) {
      return 'overdue';
    }

    return 'today';
  }

  const due = dateKey(task.dueDate);

  if (!due) {
    return 'future';
  }

  if (due < today) {
    return 'overdue';
  }

  if (due === today) {
    return 'today';
  }

  return 'future';
}