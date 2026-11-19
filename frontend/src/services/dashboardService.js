const API_URL = 'http://localhost:5200/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Не вдалося виконати запит.';

    try {
      const error = await response.json();
      message = error.message || error.title || message;
    } catch {
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const getUserStats = () =>
  request('/xp/stats');

export const getDashboardGoals = () =>
  request('/goals');

export const getDashboardTasks = () =>
  request('/tasks');

export const getDashboardGroupTasks = () =>
  request('/my/group-goals/tasks');

export const getRecommendedClubs = () =>
  request('/clubs/recommended');

export const getAvailableClubs = () =>
  request('/clubs');

export const updateTaskStatus = (taskId, status) =>
  request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const updateGroupTaskCompletion = (
  clubId,
  goalId,
  taskId,
  isCompleted
) =>
  request(
    `/clubs/${clubId}/group-goals/${goalId}/tasks/${taskId}/completion`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }
  );

export const joinClub = clubId =>
  request(`/clubs/${clubId}/join`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const getDashboardData = async () => {
  const results = await Promise.allSettled([
    getUserStats(),
    getDashboardGoals(),
    getDashboardTasks(),
    getDashboardGroupTasks(),
    getRecommendedClubs(),
    getAvailableClubs(),
  ]);

  const [
    statsResult,
    goalsResult,
    tasksResult,
    groupTasksResult,
    recommendationsResult,
    clubsResult,
  ] = results;

  const errors = [];

  const getArray = result =>
    result.status === 'fulfilled' &&
      Array.isArray(result.value)
      ? result.value
      : [];

  const stats =
    statsResult.status === 'fulfilled'
      ? statsResult.value
      : null;

  const goals = getArray(goalsResult);
  const personalTasks = getArray(tasksResult);
  const groupTasks = getArray(groupTasksResult);
  const recommendations = getArray(recommendationsResult);
  const clubs = getArray(clubsResult);

  const tasks = [
    ...personalTasks.map(task => ({
      ...task,
      source: 'personal',
      uniqueId: `personal-${task.id}`,
    })),

    ...groupTasks.map(task => ({
      ...task,
      source: 'group',
      uniqueId: `group-${task.groupGoalId}-${task.id}`,
      status: task.isCompleted
        ? 'completed'
        : 'pending',
      isRecurring: false,
      priority: 'medium',
      goalTitle: task.groupGoalTitle,
    })),
  ];

  const resourceNames = [
    'статистику',
    'цілі',
    'особисті завдання',
    'групові завдання',
    'рекомендації клубів',
    'список клубів',
  ];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      errors.push(
        `Не вдалося завантажити ${resourceNames[index]}.`
      );
    }
  });

  const clubsById = new Map(
    clubs.map(club => [club.id, club])
  );

  const enrichedRecommendations =
    recommendations.map(recommendation => {
      const club = clubsById.get(recommendation.id);

      return {
        ...recommendation,
        membersCount: club?.membersCount ?? null,
        isMember: club?.isMember ?? false,
        isOwner: club?.isOwner ?? false,
      };
    });

  return {
    stats,
    goals,
    tasks,
    recommendedClubs: enrichedRecommendations,
    errors,
  };
};