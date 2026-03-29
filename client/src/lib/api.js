const normalizeApiUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://${raw}`;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL) || (import.meta.env.DEV ? 'http://localhost:3000' : '');
const AUTH_TOKEN_KEY = 'ferienplanerAuthToken';
const CALENDAR_SLUG_KEY = 'ferienplanerTargetSlug';

export const getApiUrl = () => API_URL;

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
};

export const setStoredAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const clearStoredAuthToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getStoredCalendarSlug = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CALENDAR_SLUG_KEY) || '';
};

export const authFetch = async (path, init = {}) => {
  const token = getStoredAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const calendarSlug = getStoredCalendarSlug();
  if (calendarSlug) {
    headers.set('X-Calendar-Slug', calendarSlug);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ferienplaner:unauthorized'));
  }

  return response;
};
