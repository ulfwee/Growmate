const API_ORIGIN = (
    import.meta.env.VITE_API_URL || 'http://localhost:5200'
).replace(/\/+$/, '').replace(/\/api$/, '');

const API_URL = `${API_ORIGIN}/api`;

async function request(path, options = {}) {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),

            ...(options.body && !(options.body instanceof FormData)
                ? { 'Content-Type': 'application/json' }
                : {}),

            ...options.headers,
        },
    });

    const text = await response.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
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

const tasksPath = (clubId, goalId) =>
    `/clubs/${clubId}/group-goals/${goalId}/tasks`;

export function submitTask(clubId, goalId, taskId, { reportText, evidenceUrl, attachments = [] }) 
{
    const body = new FormData();

    body.append('ReportText', reportText);

    if (evidenceUrl?.trim()) {
        body.append('EvidenceUrl', evidenceUrl.trim());
    }

    for (const file of attachments) {
        body.append('Attachments', file);
    }

    return request(
        `${tasksPath(clubId, goalId)}/${taskId}/submissions`,
        {
            method: 'POST',
            body,
        }
    );
}

export const getMyTaskSubmissions = (clubId, goalId, taskId) =>
    request(
        `${tasksPath(clubId, goalId)}/${taskId}/submissions/my`
    );

export const getTaskSubmissions = (clubId, goalId, taskId) =>
    request(
        `${tasksPath(clubId, goalId)}/${taskId}/submissions`
    );

export const getPendingTaskSubmissions = clubId =>
    request(`/clubs/${clubId}/task-submissions/pending`);

export const getTaskSubmission = (clubId, goalId, submissionId) =>
    request(
        `${tasksPath(clubId, goalId)}/submissions/${submissionId}`
    );

export const reviewTaskSubmission = (clubId, goalId, submissionId, { rating, reviewComment }) =>
    request(
        `${tasksPath(clubId, goalId)}/submissions/${submissionId}/review`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                rating: Number(rating),
                reviewComment,
            }),
        }
    );

export async function fetchTaskAttachment(attachment, signal) {
    const path = attachment.fileUrl;

    if (
        typeof path !== 'string' ||
        !/^\/api\/clubs\/\d+\/group-goals\/\d+\/tasks\/attachments\/[a-f0-9]{32}$/i.test(path)
    ) {
        throw new Error('Некоректна адреса вкладення.');
    }

    const token = localStorage.getItem('token');

    const response = await fetch(`${API_ORIGIN}${path}`, {
        headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},

        redirect: 'error',
        signal,
    });

    if (!response.ok) {
        throw new Error(
            `Не вдалося завантажити файл (${response.status}).`
        );
    }

    return response.blob();
}

export async function downloadTaskAttachment(attachment) {
    const url = URL.createObjectURL(
        await fetchTaskAttachment(attachment)
    );

    const link = document.createElement('a');

    link.href = url;
    link.download = attachment.fileName || 'attachment';

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}