export const initials = (value) =>
    (value || '?').trim().slice(0, 2).toUpperCase();

export const formatDate = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('uk-UA', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5200').replace(/\/$/, '');
export const attachmentUrl = (path) => path?.startsWith('/') ? `${API_ORIGIN}${path}` : path;
export const isImageAttachment = (path) => /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(path || '');
export const attachmentLabel = (path) => {
    const name = decodeURIComponent((path || '').split('/').pop().split('?')[0]);
    return name.replace(/^[0-9a-f]{32}_/i, '') || 'Завантажити вкладення';
};

export const POST_TYPES = {
    update: 'Оновлення',
    report: 'Звіт про прогрес',
    achievement: 'Досягнення',
};