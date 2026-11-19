import { API_ORIGIN } from '../services/clubsService';

export function getImageUrl(url) {
  if (!url || !url.trim()) return null;
  const value = url.trim();
  if (/^(blob:|data:)/i.test(value)) return value;

  try {
    const parsed = new URL(value);
    if (['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.pathname.startsWith('/uploads/clubs/')) {
      return new URL(parsed.pathname + parsed.search, API_ORIGIN).href;
    }
    return parsed.href;
  } catch {
    return new URL(value.startsWith('/') ? value : '/' + value, API_ORIGIN).href;
  }
}