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

const isSameOriginRequest = (apiUrl) => {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(apiUrl, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(options.status || 0);
    this.data = options.data ?? null;
    this.kind = options.kind || 'unknown';
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isUnauthorized = Boolean(options.isUnauthorized ?? this.status === 401);
    this.cause = options.cause;
  }
}

export const getApiUrl = () => resolveApiUrl();

export const getStoredAuthToken = () => {
  return '';
};

export const setStoredAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
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

export const setStoredCalendarSlug = (slug) => {
  if (typeof window === 'undefined') return;
  if (slug) {
    const normalized = String(slug);
    localStorage.setItem(CALENDAR_SLUG_KEY, normalized);
  } else {
    localStorage.removeItem(CALENDAR_SLUG_KEY);
  }
};

const appendCalendarSlug = (path, calendarSlug) => {
  if (!calendarSlug || !String(path || '').startsWith('/api/')) return path;
  const normalizedSlug = String(calendarSlug).trim();
  if (!normalizedSlug) return path;
  if (String(path).includes('calendarSlug=')) return path;
  return `${path}${String(path).includes('?') ? '&' : '?'}calendarSlug=${encodeURIComponent(normalizedSlug)}`;
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
    const causeMessage = String(error.message || '').toLowerCase();
    const kind = causeMessage.includes('abort') ? 'aborted' : 'network';
    return new ApiError('Server nicht erreichbar. Bitte Verbindung prüfen und erneut versuchen.', {
      cause: error,
      isNetworkError: true,
      kind,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || fallbackMessage, {
      cause: error,
      kind: 'unknown',
    });
  }

  return new ApiError(fallbackMessage, { kind: 'unknown' });
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

const isAuthStatusPath = (path) => String(path || '').startsWith('/api/auth/status');

const debugAuthStatus = (...args) => {
  if (typeof window === 'undefined') return;
  console.info('[ferienplaner][auth-status]', ...args);
};

export const authFetch = async (path, init = {}) => {
  const apiUrl = resolveApiUrl();
  const headers = new Headers(init.headers || {});
  const sameOrigin = isSameOriginRequest(apiUrl);
  const requestPath = appendCalendarSlug(path, getStoredCalendarSlug());
  const requestUrl = sameOrigin ? requestPath : `${apiUrl}${requestPath}`;
  const debugRequest = isAuthStatusPath(path);
  const startedAt = debugRequest ? Date.now() : 0;
  const requestInit = {
    ...init,
    credentials: sameOrigin ? 'same-origin' : 'include',
  };

  if (headers.size > 0) {
    requestInit.headers = headers;
  }

  const maxAttempts = sameOrigin && isGetRequest(init) ? 3 : 1;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    try {
      const currentAttempt = attempt + 1;
      if (debugRequest) {
        debugAuthStatus('fetch:start', {
          requestUrl,
          sameOrigin,
          credentials: requestInit.credentials,
          attempt: currentAttempt,
          maxAttempts,
        });
      }
      const response = withUnauthorizedEvent(await fetch(requestUrl, requestInit));
      if (debugRequest) {
        debugAuthStatus('fetch:success', {
          status: response.status,
          ok: response.ok,
          attempt: currentAttempt,
          durationMs: Date.now() - startedAt,
        });
      }
      return response;
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (debugRequest) {
        debugAuthStatus('fetch:error', {
          attempt,
          maxAttempts,
          name: error?.name || 'Error',
          message: error?.message || String(error),
          durationMs: Date.now() - startedAt,
        });
      }
      if (!(error instanceof TypeError) || attempt >= maxAttempts) {
        throw error;
      }
      await delay(250 * attempt);
    }
  }

  throw lastError;
};

export const requestJson = async (path, init = {}, fallbackMessage = 'Anfrage fehlgeschlagen') => {
  let response;
  const debugRequest = isAuthStatusPath(path);

  try {
    response = await authFetch(path, init);
  } catch (error) {
    if (debugRequest) {
      debugAuthStatus('requestJson:transport-error', {
        name: error?.name || 'Error',
        message: error?.message || String(error),
      });
    }
    throw toApiError(error, fallbackMessage);
  }

  let data = null;
  try {
    data = await readResponseData(response);
  } catch (error) {
    if (debugRequest) {
      debugAuthStatus('requestJson:parse-error', {
        status: response.status,
        name: error?.name || 'Error',
        message: error?.message || String(error),
      });
    }
    throw new ApiError('Serverantwort konnte nicht gelesen werden.', {
      status: response.status,
      cause: error,
      data: null,
      kind: 'parse',
      isUnauthorized: response.status === 401,
    });
  }

  if (!response.ok) {
    if (debugRequest) {
      debugAuthStatus('requestJson:http-error', {
        status: response.status,
        data,
      });
    }
    throw new ApiError(extractErrorMessage(response, data, fallbackMessage), {
      status: response.status,
      data,
      kind: 'http',
      isUnauthorized: response.status === 401,
    });
  }

  if (debugRequest) {
    debugAuthStatus('requestJson:ok', {
      status: response.status,
      authenticated: typeof data === 'object' ? data?.authenticated : undefined,
    });
  }

  return data;
};
