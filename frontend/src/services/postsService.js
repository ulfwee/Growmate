const API = import.meta.env.API_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.message ||
      `Помилка запиту (${response.status})`
    );
  }

  return response.status === 204
    ? null
    : response.json();
}

export const getClubPosts = (clubId) =>
  request(`/posts/club/${clubId}`);

export const getPost = (id) =>
  request(`/posts/${id}`);

export const createPost = (data) =>
  request('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updatePost = (id, data) =>
  request(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deletePost = (id) =>
  request(`/posts/${id}`, {
    method: 'DELETE',
  });

export const setPostReaction = (
  id,
  reactionType = 'like'
) =>
  request(`/posts/${id}/reactions`, {
    method: 'PUT',
    body: JSON.stringify({ reactionType }),
  });

export const removePostReaction = (id) =>
  request(`/posts/${id}/reactions`, {
    method: 'DELETE',
  });

export const getPostComments = (postId) =>
  request(`/posts/${postId}/comments`);

export const createPostComment = (
  postId,
  content
) =>
  request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const updatePostComment = (
  postId,
  commentId,
  content
) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });

export const deletePostComment = (
  postId,
  commentId
) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
  });

export async function uploadPostAttachment(clubId, file) {
  const form = new FormData();
  form.append('clubId', String(clubId));
  form.append('file', file);
  const token = localStorage.getItem('token');
  const response = await fetch(`${API}/api/posts/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Помилка завантаження (${response.status})`);
  }
  return response.json();
}