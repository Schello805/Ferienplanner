import { requestJson, setStoredCalendarSlug } from './api';

describe('requestJson', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses cookie-based requests without custom auth headers and appends calendar slug context', async () => {
    setStoredCalendarSlug('familie-muster');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestJson('/api/auth/status')).resolves.toEqual({ ok: true });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/status?calendarSlug=familie-muster');
    expect(options.credentials).toBe('same-origin');
    expect(options.headers).toBeUndefined();
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
