import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, requestJson } from '../lib/api';
import { useAuthState } from './useAuthState';

vi.mock('../lib/api', async (importOriginal) => ({ ...await importOriginal(), requestJson: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

const user = { id: 2, username: 'max', isAdmin: false };
const calendar = { id: 2, slug: 'max', role: 'owner' };
const credentials = { mode: 'login', username: 'max', password: 'secret12345' };
const confirmed = { authenticated: true, user, calendar, setupRequired: false };

beforeEach(() => vi.resetAllMocks());

describe('login session handling', () => {
  it('explains rejected credentials instead of claiming an expired session', async () => {
    requestJson.mockRejectedValueOnce(new ApiError('Invalid credentials', { status: 401 }));
    const { result } = renderHook(() => useAuthState({}));
    await act(() => result.current.handleAuthSubmit(credentials));
    expect(result.current.currentUser).toBeNull();
    expect(result.current.authNotice.message).toBe('Benutzername oder Passwort ist nicht korrekt.');
  });

  it('explains when email verification is still required', async () => {
    requestJson.mockRejectedValueOnce(new ApiError('Email not verified', { status: 403 }));
    const { result } = renderHook(() => useAuthState({}));
    await act(() => result.current.handleAuthSubmit(credentials));
    expect(result.current.authNotice.message).toContain('bestätige zuerst deine E-Mail-Adresse');
  });

  it('does not enter the calendar when the browser has not stored the login cookie', async () => {
    requestJson.mockResolvedValueOnce({ user, calendar }).mockResolvedValueOnce({ authenticated: false });
    const { result } = renderHook(() => useAuthState({}));
    await act(() => result.current.handleAuthSubmit(credentials));
    expect(result.current.currentUser).toBeNull();
    expect(result.current.authNotice.title).toBe('Sitzung konnte nicht gespeichert werden');
    expect(result.current.authNotice.message).toContain('Cookies');
  });

  it('ignores a stale anonymous status response after a successful cookie-confirmed login', async () => {
    let finishOldStatus;
    requestJson.mockImplementationOnce(() => new Promise((resolve) => { finishOldStatus = resolve; }))
      .mockResolvedValueOnce({ user, calendar })
      .mockResolvedValueOnce(confirmed);
    const { result } = renderHook(() => useAuthState({}));
    let pending;
    act(() => { pending = result.current.refreshAuthStatus(); });
    await act(() => result.current.handleAuthSubmit(credentials));
    expect(result.current.currentUser).toEqual(user);
    await act(async () => {
      finishOldStatus({ authenticated: false, setupRequired: false });
      await pending;
    });
    expect(result.current.currentUser).toEqual(user);
    expect(result.current.currentCalendar).toEqual(calendar);
    expect(result.current.authNotice).toBeNull();
  });
});
