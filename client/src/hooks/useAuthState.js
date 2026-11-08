import { useCallback, useEffect, useRef, useState } from 'react';
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
  const currentUserRef = useRef(currentUser);
  const authGenerationRef = useRef(0);
  const authMutationPendingRef = useRef(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const refreshAuthStatus = useCallback(async () => {
    if (authMutationPendingRef.current) return;
    const generation = authGenerationRef.current;
    try {
      const data = await requestJson('/api/auth/status', { cache: 'no-store' }, 'Anmeldestatus konnte nicht geladen werden');
      if (generation !== authGenerationRef.current || authMutationPendingRef.current) return;
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
      if (generation !== authGenerationRef.current || authMutationPendingRef.current) return;
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
          message: currentUserRef.current
            ? 'Deine aktuelle Ansicht bleibt geöffnet. Einige Daten sind möglicherweise nicht aktuell.'
            : apiError.message,
        });
      }
    } finally {
      if (generation === authGenerationRef.current && !authMutationPendingRef.current) setAuthReady(true);
    }
  }, []);

  const handleAuthSubmit = useCallback(async ({ mode, username, email, password }) => {
    authGenerationRef.current += 1;
    authMutationPendingRef.current = true;
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

      const confirmed = await requestJson('/api/auth/status', { cache: 'no-store' }, 'Anmeldung konnte nicht überprüft werden');
      if (!confirmed.authenticated || confirmed.user?.id !== data.user?.id) {
        const message = 'Die Anmeldung konnte im Browser nicht gespeichert werden. Bitte erlaube Cookies für diese Website, öffne die App über ihre HTTPS-Adresse und melde dich erneut an.';
        setCurrentUser(null);
        setCurrentCalendar(null);
        setAuthNotice({ tone: 'error', title: 'Sitzung konnte nicht gespeichert werden', message });
        toast.error(message);
        return;
      }
      setCurrentUser(normalizeUser(confirmed.user));
      setCurrentCalendar(confirmed.calendar || null);
      try {
        setStoredCalendarSlug(confirmed.calendar?.slug || '');
      } catch {
        // Authentication remains usable when local storage is unavailable.
      }
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
      const message = apiError.status === 401
        ? 'Benutzername oder Passwort ist nicht korrekt.'
        : apiError.status === 403 && apiError.message === 'Email not verified'
          ? 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Bestätigungsmail.'
          : apiError.message || 'Anmeldung fehlgeschlagen';
      if (!apiError.isNetworkError) setAuthNotice({ tone: 'error', title: 'Anmeldung fehlgeschlagen', message });
      toast.error(message);
    } finally {
      authMutationPendingRef.current = false;
      setAuthSubmitting(false);
    }
  }, [pendingInviteToken, setupRequired]);

  const handleLogout = useCallback(async () => {
    authGenerationRef.current += 1;
    authMutationPendingRef.current = true;
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearStoredAuthToken();
      setCurrentUser(null);
      setCurrentCalendar(null);
      authMutationPendingRef.current = false;
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
