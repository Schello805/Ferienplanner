export function getCookieValue(req, name) {
  const cookieHeader = String(req.headers.cookie || '');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const entry of cookies) {
    const [rawName, ...rawValueParts] = entry.split('=');
    if (String(rawName || '').trim() !== name) continue;
    const rawValue = rawValueParts.join('=').trim();
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1];
  return getCookieValue(req, 'ferienplanerAuthToken');
}

export function getRequestedCalendarSlug(req) {
  return (
    req.get('X-Calendar-Slug')
    || req.query?.calendarSlug
    || getCookieValue(req, 'ferienplanerTargetSlug')
    || ''
  );
}
