const API_URL = import.meta.env.API_URL;

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) 
    throw new Error(data?.message || data?.title || 'Сталася помилка. Спробуйте ще раз.');

  return data;
}

export async function registerUser(userData) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  if (data.token) 
    localStorage.setItem('token', data.token);

  return data;
}

export async function loginUser(credentials) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (data.token)
    localStorage.setItem('token', data.token);

  return data;
}

export async function getMe() {
  const token = localStorage.getItem('token');

  if (!token) 
    return null;

  try {
    return await request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    localStorage.removeItem('token');
    return null;
  }
}

export function logout() {
  localStorage.removeItem('token');
}


export async function updateMe(profileData) {
  const token = localStorage.getItem('token');

  return request('/auth/me', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
}

export async function deleteMe() {
  const token = localStorage.getItem('token');

  return request('/auth/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateProfileWithAvatar(profileData, avatarFile) {
  const token = localStorage.getItem('token');

  const formData = new FormData();

  formData.append('Username', profileData.username);

  formData.append('FirstName', profileData.firstName || '');
  formData.append('LastName', profileData.lastName || '');
  formData.append('Bio', profileData.bio || '');
  formData.append('BirthDate', profileData.birthDate || '');

  if (avatarFile) {
    formData.append('Avatar', avatarFile);
  }

  const response = await fetch(
    `${API_URL}/auth/me-with-avatar`,
    {
      method: 'PUT',
      headers: {
        ...(token ? {
          Authorization: `Bearer ${token}`,
        } : {}),
      },
      body: formData,
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.title ||
      'Не вдалося оновити профіль.'
    );
  }

  return data;
}

export async function loginWithGoogle(credential) {
  const data = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

  if (data.token) {
    localStorage.setItem('token', data.token);
  }

  return data;
}