const normalizeApiUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://${raw}`;
};

const resolveApiUrl = () => {
  const configuredUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
  if (configuredUrl) return configuredUrl;

  if (typeof window === 'undefined') {
    return import.meta.env.DEV ? 'http://localhost:3000' : '';
  }

  const { protocol, hostname, port, origin } = window.location;
  if (!import.meta.env.DEV || port === '3000') {
    return origin;
  }

  return `${protocol}//${hostname}:3000`;
};

const AUTH_TOKEN_KEY = 'ferienplanerAuthToken';
const CALENDAR_SLUG_KEY = 'ferienplanerTargetSlug';

const shouldUseSecureCookies = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:';

const writeCookie = (name, value) => {
  if (typeof document === 'undefined') return;
  const secure = shouldUseSecureCookies() ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}`;
};

const clearCookie = (name) => {
  if (typeof document === 'undefined') return;
  const secure = shouldUseSecureCookies() ? '; Secure' : '';
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
};

const isSameOriginRequest = (apiUrl) => {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(apiUrl, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

const shouldUseCookieAuth = (apiUrl) =>
  isSameOriginRequest(apiUrl) && shouldUseSecureCookies();

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(options.status || 0);
    this.data = options.data ?? null;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isUnauthorized = Boolean(options.isUnauthorized ?? this.status === 401);
    this.cause = options.cause;
  }
}

export const getApiUrl = () => resolveApiUrl();

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
};

export const setStoredAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    writeCookie(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    clearCookie(AUTH_TOKEN_KEY);
  }
};

export const clearStoredAuthToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  clearCookie(AUTH_TOKEN_KEY);
};

export const getStoredCalendarSlug = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CALENDAR_SLUG_KEY) || '';
};

export const setStoredCalendarSlug = (slug) => {
  if (typeof window === 'undefined') return;
  if (slug) {
    const normalized = String(slug);
    localStorage.setItem(CALENDAR_SLUG_KEY, normalized);
    writeCookie(CALENDAR_SLUG_KEY, normalized);
  } else {
    localStorage.removeItem(CALENDAR_SLUG_KEY);
    clearCookie(CALENDAR_SLUG_KEY);
  }
};

const readResponseData = async (response) => {
  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (response, data, fallbackMessage) => {
  if (data && typeof data === 'object') {
    const message = data.error || data.message || data.detail;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (response.status === 0) {
    return fallbackMessage;
  }

  return `${fallbackMessage} (${response.status})`;
};

export const toApiError = (error, fallbackMessage = 'Anfrage fehlgeschlagen') => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ApiError('Server nicht erreichbar. Bitte Verbindung prüfen und erneut versuchen.', {
      cause: error,
      isNetworkError: true,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || fallbackMessage, { cause: error });
  }

  return new ApiError(fallbackMessage);
};

export const getApiErrorMessage = (error, fallbackMessage = 'Anfrage fehlgeschlagen') =>
  toApiError(error, fallbackMessage).message || fallbackMessage;

const isGetRequest = (init = {}) => String(init.method || 'GET').toUpperCase() === 'GET';

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

function withUnauthorizedEvent(response) {
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ferienplaner:unauthorized'));
  }
  return response;
}

export const authFetch = async (path, init = {}) => {
  const apiUrl = resolveApiUrl();
  const headers = new Headers(init.headers || {});
  const cookieAuth = shouldUseCookieAuth(apiUrl);
  const sameOrigin = isSameOriginRequest(apiUrl);

  if (!cookieAuth) {
    const token = getStoredAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const calendarSlug = getStoredCalendarSlug();
    if (calendarSlug) {
      headers.set('X-Calendar-Slug', calendarSlug);
    }
  }

  const requestUrl = sameOrigin ? path : `${apiUrl}${path}`;
  const requestInit = {
    ...init,
    credentials: cookieAuth ? 'same-origin' : init.credentials,
  };

  if (headers.size > 0) {
    requestInit.headers = headers;
  }

  try {
    return withUnauthorizedEvent(await fetch(requestUrl, requestInit));
  } catch (error) {
    if (!(error instanceof TypeError) || !sameOrigin || !isGetRequest(init)) {
      throw error;
    }

    await delay(250);
    return withUnauthorizedEvent(await fetch(requestUrl, requestInit));
  }

};

export const requestJson = async (path, init = {}, fallbackMessage = 'Anfrage fehlgeschlagen') => {
  let response;

  try {
    response = await authFetch(path, init);
  } catch (error) {
    throw toApiError(error, fallbackMessage);
  }

  let data = null;
  try {
    data = await readResponseData(response);
  } catch (error) {
    throw new ApiError('Serverantwort konnte nicht gelesen werden.', {
      status: response.status,
      cause: error,
      data: null,
      isUnauthorized: response.status === 401,
    });
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(response, data, fallbackMessage), {
      status: response.status,
      data,
      isUnauthorized: response.status === 401,
    });
  }

  return data;
};
