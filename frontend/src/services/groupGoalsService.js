const API_URL = 'http://localhost:5200/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body !== undefined
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
    throw new Error(
      data?.message ||
      data?.title ||
      (typeof data === 'string' ? data : null) ||
      `Помилка сервера (${response.status}).`
    );
  }

  return data;
}

const goalPath = clubId =>
  `/clubs/${clubId}/group-goals`;

export const getGroupGoals = clubId =>
  request(goalPath(clubId));

export const getGroupGoal = (clubId, goalId) =>
  request(`${goalPath(clubId)}/${goalId}`);

export const createGroupGoal = (clubId, data) =>
  request(goalPath(clubId), {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateGroupGoal = (clubId, goalId, data) =>
  request(`${goalPath(clubId)}/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteGroupGoal = (clubId, goalId) =>
  request(`${goalPath(clubId)}/${goalId}`, {
    method: 'DELETE',
  });

export const joinGroupGoal = (clubId, goalId) =>
  request(`${goalPath(clubId)}/${goalId}/join`, {
    method: 'POST',
  });

export const leaveGroupGoal = (clubId, goalId) =>
  request(`${goalPath(clubId)}/${goalId}/leave`, {
    method: 'DELETE',
  });


const taskPath = (clubId, goalId) =>
  `${goalPath(clubId)}/${goalId}/tasks`;

export const getGroupGoalTasks = (clubId, goalId) =>
  request(taskPath(clubId, goalId));

export const createGroupGoalTask = (clubId, goalId, data) =>
  request(taskPath(clubId, goalId), {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateGroupGoalTask = (
  clubId, goalId, taskId, data
) =>
  request(`${taskPath(clubId, goalId)}/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteGroupGoalTask = (
  clubId, goalId, taskId
) =>
  request(`${taskPath(clubId, goalId)}/${taskId}`, {
    method: 'DELETE',
  });

export const setGroupGoalTaskCompletion = (
  clubId, goalId, taskId, isCompleted
) =>
  request(
    `${taskPath(clubId, goalId)}/${taskId}/completion`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }
  );

export const getMyGroupGoals = () =>
  request('/my/group-goals');

export const getMyGroupGoalTasks = () =>
  request('/my/group-goals/tasks');