import { requestJson, setStoredAuthToken, setStoredCalendarSlug } from './api';

describe('requestJson', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps auth and slug headers on local http same-origin', async () => {
    setStoredAuthToken('token-123');
    setStoredCalendarSlug('familie-muster');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestJson('/api/auth/status')).resolves.toEqual({ ok: true });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.get('Authorization')).toBe('Bearer token-123');
    expect(options.headers.get('X-Calendar-Slug')).toBe('familie-muster');
  });

  it('turns network failures into ApiError with network flag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(requestJson('/api/vacations')).rejects.toMatchObject({
      name: 'ApiError',
      isNetworkError: true,
      message: 'Server nicht erreichbar. Bitte Verbindung prüfen und erneut versuchen.',
    });
  });

  it('uses backend error messages from non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Kalender nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    ));

    await expect(requestJson('/api/calendar/settings')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Kalender nicht gefunden',
      status: 404,
      isUnauthorized: false,
    });
  });
});
