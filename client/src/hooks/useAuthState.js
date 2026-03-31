import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  authFetch,
  clearStoredAuthToken,
  requestJson,
  setStoredCalendarSlug,
  toApiError,
} from '../lib/api';

const normalizeUser = (user) => {
  if (!user) return null;
  const isAdmin = Boolean(user.isAdmin ?? user.is_admin ?? user.admin);
  return { ...user, isAdmin };
};

export const useAuthState = ({ pendingInviteToken }) => {
  const [apiOnline, setApiOnline] = useState(true);
  const [authNotice, setAuthNotice] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCalendar, setCurrentCalendar] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const data = await requestJson('/api/auth/status', {}, 'Anmeldestatus konnte nicht geladen werden');
      setApiOnline(true);
      setAuthNotice(null);
      setSetupRequired(Boolean(data.setupRequired));
      setCurrentUser(data.authenticated ? normalizeUser(data.user) : null);
      setCurrentCalendar(data.authenticated ? data.calendar : null);
      if (data.authenticated && data.calendar?.slug) {
        try {
          setStoredCalendarSlug(String(data.calendar.slug));
        } catch {
          // ignore storage errors
        }
      }
    } catch (error) {
      const apiError = toApiError(error, 'Anmeldestatus konnte nicht geladen werden');
      console.error('Failed to load auth status', apiError);
      if (apiError.isUnauthorized) {
        clearStoredAuthToken();
        setCurrentUser(null);
        setCurrentCalendar(null);
        setAuthNotice(null);
      } else {
        setApiOnline(false);
        setAuthNotice({
          tone: 'error',
          title: 'Server aktuell nicht erreichbar',
          message: currentUser
            ? 'Deine aktuelle Ansicht bleibt geöffnet. Einige Daten sind möglicherweise nicht aktuell.'
            : apiError.message,
        });
      }
    } finally {
      setAuthReady(true);
    }
  }, [currentUser]);

  const handleAuthSubmit = useCallback(async ({ mode, username, email, password }) => {
    setAuthSubmitting(true);
    try {
      const effectiveMode = setupRequired ? 'setup' : (mode || 'login');
      const path = effectiveMode === 'setup'
        ? '/api/auth/bootstrap'
        : effectiveMode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login';
      const data = await requestJson(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      }, effectiveMode === 'register' ? 'Registrierung fehlgeschlagen' : 'Anmeldung fehlgeschlagen');
      setApiOnline(true);
      setAuthNotice(null);

      if (effectiveMode === 'register') {
        toast.success('Registriert. Bitte E-Mail bestätigen.');
        return;
      }

      setCurrentUser(normalizeUser(data.user));
      setCurrentCalendar(data.calendar || null);
      setSetupRequired(false);
      toast.success(effectiveMode === 'setup' ? 'Benutzer angelegt' : 'Angemeldet');

      if (pendingInviteToken) {
        toast.message('Einladung wird angenommen …');
      }
    } catch (error) {
      const apiError = toApiError(error, 'Anmeldung fehlgeschlagen');
      console.error(apiError);
      if (apiError.isNetworkError) {
        setApiOnline(false);
        setAuthNotice({
          tone: 'error',
          title: 'Anmeldung gerade nicht möglich',
          message: apiError.message,
        });
      }
      toast.error(apiError.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setAuthSubmitting(false);
    }
  }, [pendingInviteToken, setupRequired]);

  const handleLogout = useCallback(async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearStoredAuthToken();
      setCurrentUser(null);
      setCurrentCalendar(null);
      await refreshAuthStatus();
      toast.success('Abgemeldet');
    }
  }, [refreshAuthStatus]);

  return {
    apiOnline,
    setApiOnline,
    authNotice,
    setAuthNotice,
    authReady,
    setAuthReady,
    setupRequired,
    setSetupRequired,
    currentUser,
    setCurrentUser,
    currentCalendar,
    setCurrentCalendar,
    authSubmitting,
    refreshAuthStatus,
    handleAuthSubmit,
    handleLogout,
  };
};
