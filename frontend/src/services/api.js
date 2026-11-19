const API_URL = '/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let message = `Помилка сервера: ${response.status}`;

      try {
        const contentType =
          response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const error = await response.json();

          message =
            error.message ||
            error.detail ||
            error.title ||
            message;
        } else {
          const errorText = await response.text();

          if (errorText && errorText.length < 300) {
            message = errorText;
          }
        }
      } catch {
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  } catch (error) {
    console.error('Помилка запиту до API:', error);
    throw error;
  }
};