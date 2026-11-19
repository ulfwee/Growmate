const API_URL = 'http://localhost:5200/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data &&
        typeof data === 'object' &&
        (data.message || data.title || data.error)) ||
      (typeof data === 'string' && data) ||
      `Помилка запиту (${response.status})`;

    throw new Error(message);
  }

  return data;
}

export const getTasks = () =>
  request('/tasks');

export const createTask = data =>
  request('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const editTask = (id, data) =>
  request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const setTaskStatus = (id, status) =>
  request(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteTask = id =>
  request(`/tasks/${id}`, {
    method: 'DELETE',
  });

export const getTaskGoals = () =>
  request('/goals');

export const getTaskMilestones = goalId =>
  request(`/goals/${goalId}/milestones`);

export const getTaskOccurrences = taskId =>
  request(`/tasks/${taskId}/occurrences`);

export const setOccurrenceCompletion = (
  taskId,
  scheduledDate,
  isCompleted
) =>
  request(
    `/tasks/${taskId}/occurrences/${scheduledDate}/completion`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }
  );