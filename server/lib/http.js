export function validatePublicBaseUrl({ publicBaseUrl, nodeEnv }) {
  const normalizedBaseUrl = String(publicBaseUrl || '').trim();
  if (!normalizedBaseUrl) {
    if (nodeEnv === 'production') {
      throw new Error('PUBLIC_BASE_URL is required in production');
    }
    return null;
  }

  try {
    const parsed = new URL(normalizedBaseUrl);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid PUBLIC_BASE_URL: ${normalizedBaseUrl}`);
  }
}

export function buildAllowedOrigins({ port, publicBaseUrl }) {
  const origins = new Set([
    `http://localhost:${port}`,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ]);

  const normalizedBaseUrl = String(publicBaseUrl || '').trim();
  if (normalizedBaseUrl) {
    try {
      const parsedUrl = new URL(normalizedBaseUrl);
      origins.add(parsedUrl.origin);
      
      // Allow www variant automatically
      if (!parsedUrl.hostname.startsWith('www.')) {
        const wwwUrl = new URL(normalizedBaseUrl);
        wwwUrl.hostname = 'www.' + parsedUrl.hostname;
        origins.add(wwwUrl.origin);
      }
    } catch {
      // ignore invalid PUBLIC_BASE_URL
    }
  }

  return origins;
}

export function createCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Calendar-Slug'],
  };
}

export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', req.path.startsWith('/api/') ? 'cross-origin' : 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV !== 'development') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function getPublicBaseUrl(req, port) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  const origin = req.get('origin');
  if (origin) return String(origin).replace(/\/$/, '');
  return `http://localhost:${port}`;
}

export function shouldUseSecureCookies(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  if (forwardedProto === 'https') return true;
  if (req.secure) return true;

  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (publicBaseUrl) {
    try {
      return new URL(publicBaseUrl).protocol === 'https:';
    } catch {
      return false;
    }
  }

  return false;
}

export function appendCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(String(value ?? ''))}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAge === 0) {
    parts.push('Max-Age=0');
  } else if (Number.isFinite(options.maxAge) && options.maxAge > 0) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.secure) parts.push('Secure');
  if (options.httpOnly) parts.push('HttpOnly');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearSessionCookies(req, res) {
  const secure = shouldUseSecureCookies(req);
  appendCookie(res, 'ferienplanerAuthToken', '', { maxAge: 0, secure, httpOnly: true });
  appendCookie(res, 'ferienplanerTargetSlug', '', { maxAge: 0, secure });
}

export function setSessionCookies(req, res, authState, sessionTtlMs) {
  const secure = shouldUseSecureCookies(req);
  const maxAgeSeconds = Math.floor(sessionTtlMs / 1000);
  if (authState?.token) {
    appendCookie(res, 'ferienplanerAuthToken', authState.token, { maxAge: maxAgeSeconds, secure, httpOnly: true });
  }
  if (authState?.calendar?.slug) {
    appendCookie(res, 'ferienplanerTargetSlug', authState.calendar.slug, { maxAge: maxAgeSeconds, secure });
  }
}
