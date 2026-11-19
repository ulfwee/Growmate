const API_URL = 'http://localhost:5200/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.title ||
      `Помилка запиту: ${response.status}`
    );
  }

  return data;
}

export async function getInterests() {
  return request('/interests');
}

export async function getMyInterests() {
  return request('/interests/my');
}

export async function saveMyInterests(interestIds) {
  return request('/interests/my', {
    method: 'PUT',
    body: JSON.stringify({ interestIds }),
  });
}