const API_URL = `${
  import.meta.env.VITE_API_URL || 'http://localhost:5200'
}/api`;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      (data && typeof data === 'object' &&
        (data.message || data.title || data.error)) ||
      (typeof data === 'string' && data) ||
      `Помилка запиту (${response.status})`;

    throw new Error(message);
  }

  return data;
}

export const getGoals = () => request('/goals');

export const createGoal = data =>
  request('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateGoal = (id, data) =>
  request(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteGoal = id =>
  request(`/goals/${id}`, {
    method: 'DELETE',
  });

export const changeGoalStatus = (id, status) =>
  request(`/goals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(status),
  });

export const getMilestones = goalId =>
  request(`/goals/${goalId}/milestones`);

export const createMilestone = (goalId, data) =>
  request(`/goals/${goalId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMilestone = (goalId, milestoneId, data) =>
  request(`/goals/${goalId}/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMilestone = (goalId, milestoneId) =>
  request(`/goals/${goalId}/milestones/${milestoneId}`, {
    method: 'DELETE',
  });

export const changeMilestoneCompletion = (
  goalId,
  milestoneId,
  isCompleted
) =>
  request(`/goals/${goalId}/milestones/${milestoneId}/completion`, {
    method: 'PATCH',
    body: JSON.stringify(isCompleted),
  });

export const getGoalTasks = async goalId => {
  const tasks = await request('/tasks');

  return Array.isArray(tasks)
    ? tasks.filter(task => String(task.goalId) === String(goalId))
    : [];
};