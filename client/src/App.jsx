import { useState, useEffect, useCallback, useRef } from 'react'
import CalendarView from './components/CalendarView'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { UtilitySidebar } from './components/UtilitySidebar'
import { AuthScreen } from './components/AuthScreen'
import { ChangelogModal } from './components/ChangelogModal.jsx'
import { Toaster } from 'sonner'
import { toast } from 'sonner'
import { GERMAN_STATE_MAP } from './constants/germanStates'
import { authFetch, clearStoredAuthToken, setStoredAuthToken } from './lib/api'

const formatLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeUser = (user) => {
  if (!user) return null;
  const isAdmin = Boolean(user.isAdmin ?? user.is_admin ?? user.admin);
  return { ...user, isAdmin };
};

const CALENDAR_SLUG_STORAGE_KEY = 'ferienplanerTargetSlug';
const SETUP_DRAFT_KEY = 'ferienplanerSetupDraft';

const createDefaultRecurringRule = () => ({
  frequency: 'weekly',
  anchorDate: formatLocalDateInput(new Date()),
});

const createRecurringRuleEntry = (overrides = {}) => ({
  id: overrides.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  days: overrides.days || [],
  frequency: overrides.frequency || 'weekly',
  anchorDate: overrides.anchorDate || formatLocalDateInput(new Date()),
});

const loadRecurringRules = (rulesKey, daysKey, singleRuleKey) => {
  if (typeof window === 'undefined') {
    return [createRecurringRuleEntry()];
  }

  const savedRules = localStorage.getItem(rulesKey);
  if (savedRules) {
    try {
      const parsed = JSON.parse(savedRules);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((rule) => createRecurringRuleEntry(rule));
      }
    } catch {
      // ignore broken persisted state and fall back
    }
  }

  const savedDays = localStorage.getItem(daysKey);
  const savedRule = localStorage.getItem(singleRuleKey);

  let days = [];
  let singleRule = createDefaultRecurringRule();

  try {
    days = savedDays ? JSON.parse(savedDays) : [];
  } catch {
    days = [];
  }

  try {
    singleRule = savedRule ? JSON.parse(savedRule) : createDefaultRecurringRule();
  } catch {
    singleRule = createDefaultRecurringRule();
  }

  return [createRecurringRuleEntry({
    days: Array.isArray(days) ? days : [],
    frequency: singleRule?.frequency || 'weekly',
    anchorDate: singleRule?.anchorDate || formatLocalDateInput(new Date()),
  })];
};

function App() {
  const currentYear = new Date().getFullYear();

  const [pendingInviteToken, setPendingInviteToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || '';
  });
  const [inviteAccepting, setInviteAccepting] = useState(false);

  const [shareMode, setShareMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('view') === 'share';
  });

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Color State
  const [p1Color, setP1Color] = useState(() => localStorage.getItem('p1Color') || '#22c55e'); // Default Green
  const [p2Color, setP2Color] = useState(() => localStorage.getItem('p2Color') || '#3b82f6'); // Default Blue
  const [careColor, setCareColor] = useState(() => localStorage.getItem('careColor') || '#a855f7'); // Default Purple

  const [p1RecurringRules, setP1RecurringRules] = useState(() => loadRecurringRules('p1RecurringRules', 'p1DaysOff', 'p1RecurringRule'));
  const [p2RecurringRules, setP2RecurringRules] = useState(() => loadRecurringRules('p2RecurringRules', 'p2DaysOff', 'p2RecurringRule'));

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [sidebarTab, setSidebarTab] = useState(() => {
    const saved = localStorage.getItem('sidebarTab') || 'legend';
    return saved === 'settings' ? 'general' : saved;
  });
  const [holidayTableOpen, setHolidayTableOpen] = useState(() => localStorage.getItem('holidayTableOpen') === 'true');
  const [stateCode, setStateCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('state');
      if (fromUrl) return fromUrl.toUpperCase();
    }
    return localStorage.getItem('stateCode') || 'BY';
  });
  const [viewYear, setViewYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = Number(params.get('year'));
      if (Number.isInteger(fromUrl) && fromUrl >= 2000 && fromUrl <= 2100) {
        return fromUrl;
      }
    }
    return currentYear;
  });
  const [totalNetHolidays, setTotalNetHolidays] = useState(0);
  const [holidayBreakdown, setHolidayBreakdown] = useState([]);
  const [apiOnline, setApiOnline] = useState(true);
  const [children, setChildren] = useState([]);
  const [childFreeDays, setChildFreeDays] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCalendar, setCurrentCalendar] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  // Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Color Persistence Effect
  useEffect(() => {
    localStorage.setItem('p1Color', p1Color);
    localStorage.setItem('p2Color', p2Color);
    localStorage.setItem('careColor', careColor);
    // Update CSS variables for dynamic usage if needed, or pass as props
    document.documentElement.style.setProperty('--color-p1', p1Color);
    document.documentElement.style.setProperty('--color-p2', p2Color);
    document.documentElement.style.setProperty('--color-care', careColor);
  }, [p1Color, p2Color, careColor]);

  useEffect(() => {
    try {
      localStorage.setItem('p1RecurringRules', JSON.stringify(p1RecurringRules));
      localStorage.setItem('p2RecurringRules', JSON.stringify(p2RecurringRules));
    } catch {
      // ignore storage errors (e.g. private mode / quota)
    }
  }, [p1RecurringRules, p2RecurringRules]);

  useEffect(() => {
    localStorage.setItem('stateCode', stateCode);
  }, [stateCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (shareMode) {
      url.searchParams.set('view', 'share');
      url.searchParams.set('year', String(viewYear));
      url.searchParams.set('state', stateCode);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('year');
      url.searchParams.delete('state');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [shareMode, stateCode, viewYear]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebarTab', sidebarTab);
  }, [sidebarTab]);

  useEffect(() => {
    localStorage.setItem('holidayTableOpen', String(holidayTableOpen));
  }, [holidayTableOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/auth/status');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `auth status failed: ${response.status}`);
      }
      setSetupRequired(Boolean(data.setupRequired));
      setCurrentUser(data.authenticated ? normalizeUser(data.user) : null);
      setCurrentCalendar(data.authenticated ? data.calendar : null);
      if (typeof window !== 'undefined' && data.authenticated && data.calendar?.slug) {
        try {
          localStorage.setItem(CALENDAR_SLUG_STORAGE_KEY, String(data.calendar.slug));
        } catch {
          // ignore storage errors
        }
      }
    } catch (error) {
      console.error('Failed to load auth status', error);
      clearStoredAuthToken();
      setCurrentUser(null);
      setCurrentCalendar(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  const loadFamilyData = useCallback(async () => {
    try {
      const [childrenRes, freeDaysRes] = await Promise.all([
        authFetch('/api/children'),
        authFetch('/api/child-free-days'),
      ]);

      if (childrenRes.status === 401 || freeDaysRes.status === 401) {
        clearStoredAuthToken();
        setCurrentUser(null);
        await refreshAuthStatus();
        return;
      }

      if (!childrenRes.ok) {
        throw new Error(`children request failed: ${childrenRes.status}`);
      }
      if (!freeDaysRes.ok) {
        throw new Error(`child-free-days request failed: ${freeDaysRes.status}`);
      }

      const [childrenData, freeDaysData] = await Promise.all([
        childrenRes.json(),
        freeDaysRes.json(),
      ]);

      setChildren(childrenData);
      setChildFreeDays(freeDaysData);
    } catch (error) {
      console.error('Failed to load family data', error);
      toast.error('Kinderdaten konnten nicht geladen werden');
    }
  }, [refreshAuthStatus]);

  const applyingSetupDraftRef = useRef(false);

  const applySetupDraftIfPresent = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!currentUser) return;
    if (applyingSetupDraftRef.current) return;

    const raw = localStorage.getItem(SETUP_DRAFT_KEY);
    if (!raw) return;

    let draft = null;
    try {
      draft = JSON.parse(raw);
    } catch {
      localStorage.removeItem(SETUP_DRAFT_KEY);
      return;
    }
    if (!draft) {
      localStorage.removeItem(SETUP_DRAFT_KEY);
      return;
    }

    applyingSetupDraftRef.current = true;
    try {
      if (draft.stateCode) {
        setStateCode(String(draft.stateCode).toUpperCase());
      }
      if (draft.colors?.p1Color) setP1Color(String(draft.colors.p1Color));
      if (draft.colors?.p2Color) setP2Color(String(draft.colors.p2Color));
      if (draft.colors?.careColor) setCareColor(String(draft.colors.careColor));

      if (typeof draft?.calendarSlug === 'string') {
        const slugRaw = String(draft.calendarSlug).trim();
        if (slugRaw) {
          try {
            const response = await authFetch('/api/calendar/slug', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug: slugRaw }),
            });
            const data = await response.json();
            if (!response.ok) {
              toast.warning(data.error || 'Kalender-Name konnte nicht übernommen werden');
            }
          } catch (error) {
            toast.warning(error?.message || 'Kalender-Name konnte nicht übernommen werden');
          }
        }
      }

      const draftChildrenRaw = Array.isArray(draft?.children)
        ? draft.children
        : draft?.child
          ? [draft.child]
          : [];

      const draftChildren = draftChildrenRaw
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({
          name: String(c.name || '').trim(),
          type: String(c.type || 'school'),
          color: c.color ? String(c.color) : null,
          usesSchoolHolidays: c.usesSchoolHolidays !== false,
        }))
        .filter((c) => c.name);

      if (draftChildren.length > 0) {
        const existingRes = await authFetch('/api/children');
        const existingData = await existingRes.json();
        if (!existingRes.ok) {
          throw new Error(existingData.error || `children request failed: ${existingRes.status}`);
        }
        const existing = Array.isArray(existingData) ? existingData : [];

        const existingKeySet = new Set(
          existing
            .filter((c) => c && typeof c === 'object')
            .map((c) => `${String(c.name || '').trim().toLowerCase()}::${String(c.type || 'school')}`)
        );

        for (const child of draftChildren) {
          const key = `${child.name.trim().toLowerCase()}::${child.type}`;
          if (existingKeySet.has(key)) continue;

          const response = await authFetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: child.name,
              type: child.type,
              color: child.color,
              usesSchoolHolidays: child.usesSchoolHolidays,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Onboarding: Kind konnte nicht angelegt werden');
          }
          existingKeySet.add(key);
        }
      }

      localStorage.removeItem(SETUP_DRAFT_KEY);
      toast.success('Einrichtung übernommen');
      await refreshAuthStatus();
      await loadFamilyData();
    } catch (error) {
      console.error('Failed to apply setup draft', error);
      toast.error(error.message || 'Einrichtung konnte nicht übernommen werden');
    } finally {
      applyingSetupDraftRef.current = false;
    }
  }, [currentUser, loadFamilyData, refreshAuthStatus, setCareColor, setP1Color, setP2Color, setStateCode]);

  useEffect(() => {
    const verifyEmail = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('verifyEmail') || '';
      if (!token) return;

      try {
        const response = await authFetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `E-Mail Verifikation fehlgeschlagen (${response.status})`);
        }
        toast.success('E-Mail bestätigt. Du kannst dich jetzt anmelden.');
      } catch (error) {
        console.error('Failed to verify email', error);
        toast.error(error.message || 'E-Mail konnte nicht bestätigt werden');
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('verifyEmail');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        await refreshAuthStatus();
      }
    };

    verifyEmail();
  }, [refreshAuthStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite') || '';
    if (token && token !== pendingInviteToken) {
      setPendingInviteToken(token);
    }
  }, [pendingInviteToken]);

  useEffect(() => {
    const handleUnauthorized = async () => {
      clearStoredAuthToken();
      setCurrentUser(null);
      setCurrentCalendar(null);
      setChildren([]);
      setChildFreeDays([]);
      await refreshAuthStatus();
      toast.error('Sitzung abgelaufen. Bitte erneut anmelden.');
    };

    window.addEventListener('ferienplaner:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ferienplaner:unauthorized', handleUnauthorized);
  }, [refreshAuthStatus]);

  useEffect(() => {
    const acceptInvite = async () => {
      if (!pendingInviteToken || !currentUser || inviteAccepting) return;

      setInviteAccepting(true);
      try {
        const response = await authFetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: pendingInviteToken }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Invite konnte nicht angenommen werden (${response.status})`);
        }

        toast.success('Einladung angenommen');
        setPendingInviteToken('');

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('invite');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }

        await refreshAuthStatus();
        await loadFamilyData();
      } catch (error) {
        console.error('Failed to accept invitation', error);
        toast.error(error.message || 'Einladung konnte nicht angenommen werden');
      } finally {
        setInviteAccepting(false);
      }
    };

    acceptInvite();
  }, [pendingInviteToken, currentUser, inviteAccepting, refreshAuthStatus, loadFamilyData]);

  useEffect(() => {
    if (currentUser) {
      loadFamilyData();
    }
  }, [currentUser, loadFamilyData]);

  useEffect(() => {
    applySetupDraftIfPresent();
  }, [applySetupDraftIfPresent]);

  const handleAuthSubmit = async ({ mode, username, email, password }) => {
    setAuthSubmitting(true);
    try {
      const effectiveMode = setupRequired ? 'setup' : (mode || 'login');
      const path = effectiveMode === 'setup'
        ? '/api/auth/bootstrap'
        : effectiveMode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login';
      const response = await authFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Anmeldung fehlgeschlagen');
      }

      if (effectiveMode === 'register') {
        toast.success('Registriert. Bitte E-Mail bestätigen.');
        return;
      }

      setStoredAuthToken(data.token);
      setCurrentUser(normalizeUser(data.user));
      setCurrentCalendar(data.calendar || null);
      setSetupRequired(false);
      toast.success(effectiveMode === 'setup' ? 'Benutzer angelegt' : 'Angemeldet');

      if (pendingInviteToken) {
        toast.message('Einladung wird angenommen …');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearStoredAuthToken();
      setCurrentUser(null);
      setCurrentCalendar(null);
      setChildren([]);
      setChildFreeDays([]);
      await refreshAuthStatus();
      toast.success('Abgemeldet');
    }
  };

  const mobileNavItems = [
    {
      id: 'calendar',
      label: 'Kalender',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 .75-.75Z" />
        </svg>
      )
    },
    {
      id: 'legend',
      label: 'Legende',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15m-15 5.25h15m-15 5.25h15" />
        </svg>
      )
    },
    {
      id: 'children',
      label: 'Kinder',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm10.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3.75 20.25a6.75 6.75 0 0 1 10.5-5.622m1.654 5.31a8.966 8.966 0 0 0 4.846 1.312c.173 0 .344-.005.514-.015a8.966 8.966 0 0 0-2.827-6.145 8.966 8.966 0 0 0-6.255-2.59c-.76 0-1.499.094-2.205.271" />
        </svg>
      )
    },
    {
      id: 'share',
      label: 'Teilen',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h9m0 0-3-3m3 3-3 3M15 4.5h1.125A2.625 2.625 0 0 1 18.75 7.125v9.75A2.625 2.625 0 0 1 16.125 19.5H15m-6 0H7.875A2.625 2.625 0 0 1 5.25 16.875v-9.75A2.625 2.625 0 0 1 7.875 4.5H9" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75a17.93 17.93 0 0 1-7.5-1.632Z" />
        </svg>
      )
    },
    {
      id: 'more',
      label: 'Mehr',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12h.008v.008H6.75V12Zm5.25 0h.008v.008H12V12Zm5.25 0h.008v.008h-.008V12Z" />
        </svg>
      )
    },
  ];

  const primaryMobileTabIds = new Set(['legend', 'children', 'share', 'profile']);
  const activeMobileNav = !isMobile || !sidebarOpen
    ? (moreMenuOpen ? 'more' : 'calendar')
    : (primaryMobileTabIds.has(sidebarTab) ? sidebarTab : 'more');
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
  const isAdmin = Boolean(currentUser?.isAdmin ?? currentUser?.is_admin ?? currentUser?.admin);

  const buildShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'share');
    url.searchParams.set('year', String(viewYear));
    url.searchParams.set('state', stateCode);
    return url.toString();
  };

  const copyShareLink = async () => {
    const shareUrl = buildShareUrl();
    if (!shareUrl) {
      toast.error('Freigabelink konnte nicht erstellt werden');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Freigabelink kopiert');
    } catch {
      toast.error('Freigabelink konnte nicht kopiert werden');
    }
  };

  const toggleShareMode = () => {
    setShareMode((current) => {
      const next = !current;
      if (next) {
        setSidebarOpen(false);
      }
      return next;
    });
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-slate-900 dark:border-white" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />
        <AuthScreen
          setupRequired={setupRequired}
          onSubmit={handleAuthSubmit}
          loading={authSubmitting}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden px-2 py-2 transition-colors duration-300 sm:px-3 sm:py-3">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
        currentUser={currentUser}
        currentCalendar={currentCalendar}
        shareMode={shareMode}
      />

      {shareMode && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-sky-900 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100">
          <div>
            <div className="font-semibold">Ansichtsmodus aktiv</div>
            <div className="text-xs opacity-80">Kompakt und schreibgeschützt. Externe Nutzer brauchen weiterhin ein Konto für diese Installation.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-slate-950 dark:text-sky-100 dark:hover:bg-sky-950/40"
            >
              Ansichtslink kopieren
            </button>
            <button
              type="button"
              onClick={() => setShareMode(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Modus beenden
            </button>
          </div>
        </div>
      )}

      <main className={`flex min-h-0 flex-1 gap-3 ${isMobile && !shareMode ? 'pb-28' : ''}`}>
        <div className="min-h-0 flex-1">
          <CalendarView
            year={viewYear}
            setYear={setViewYear}
            p1Color={p1Color}
            p2Color={p2Color}
            careColor={careColor}
            stateCode={stateCode}
            stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
            isMobile={isMobile && !shareMode}
            shareMode={shareMode}
            readOnly={shareMode}
            children={children}
            childFreeDays={childFreeDays}
            p1RecurringRules={p1RecurringRules}
            p2RecurringRules={p2RecurringRules}
            onApiStatusChange={setApiOnline}
            onStatsChange={(stats) => setTotalNetHolidays(stats.totalNetHolidays)}
            onHolidayBreakdownChange={setHolidayBreakdown}
            onCopyShareLink={copyShareLink}
            onExitShareMode={() => setShareMode(false)}
          />
        </div>

        {!shareMode && (
          <UtilitySidebar
            isMobile={isMobile}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            activeTab={sidebarTab}
            setActiveTab={setSidebarTab}
            onClose={() => setSidebarOpen(false)}
            p1Color={p1Color}
            setP1Color={setP1Color}
            p2Color={p2Color}
            setP2Color={setP2Color}
            careColor={careColor}
            setCareColor={setCareColor}
            stateCode={stateCode}
            setStateCode={setStateCode}
            currentUser={currentUser}
            currentCalendar={currentCalendar}
            apiOnline={apiOnline}
            holidayTableOpen={holidayTableOpen}
            setHolidayTableOpen={setHolidayTableOpen}
            totalNetHolidays={totalNetHolidays}
            holidayBreakdown={holidayBreakdown}
            children={children}
            childFreeDays={childFreeDays}
            onRefreshFamilyData={loadFamilyData}
            p1RecurringRules={p1RecurringRules}
            setP1RecurringRules={setP1RecurringRules}
            p2RecurringRules={p2RecurringRules}
            setP2RecurringRules={setP2RecurringRules}
            onCopyShareLink={copyShareLink}
            onEnterShareMode={() => setShareMode(true)}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            shareMode={shareMode}
            onToggleShareMode={toggleShareMode}
            onLogout={handleLogout}
          />
        )}
      </main>

      {isMobile && !shareMode && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/96">
          <div className="mx-auto grid w-full max-w-xl grid-cols-6 gap-1.5">
            {mobileNavItems.map((item) => {
              const active = activeMobileNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'calendar') {
                      setMoreMenuOpen(false);
                      setSidebarOpen(false);
                      return;
                    }
                    if (item.id === 'more') {
                      if (sidebarOpen) {
                        setSidebarOpen(false);
                        setMoreMenuOpen(false);
                        return;
                      }
                      setMoreMenuOpen((current) => !current);
                      return;
                    }
                    if (sidebarOpen && sidebarTab === item.id) {
                      setSidebarOpen(false);
                      return;
                    }
                    setSidebarTab(item.id);
                    setSidebarOpen(true);
                    setMoreMenuOpen(false);
                  }}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-semibold transition-colors ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {isMobile && !shareMode && moreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[75svh] flex-col rounded-t-3xl border-t border-slate-200 bg-white/98 px-3 pt-3 shadow-[0_-14px_40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/98">
            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Mehr</div>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Schließen
                </button>
              </div>

              <div className="mt-3 grid flex-1 grid-cols-2 gap-2 overflow-y-auto pb-3 [-webkit-overflow-scrolling:touch]">
                {[
                  { id: 'general', label: 'Allgemein' },
                  { id: 'parents', label: 'Eltern' },
                  { id: 'help', label: 'Hilfe' },
                  ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
                ].map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSidebarTab(entry.id);
                      setSidebarOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {entry.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setChangelogOpen(true);
                    setMoreMenuOpen(false);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Changelog
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleLogout();
                  }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-sm font-semibold text-rose-900 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/50"
                >
                  Abmelden
                </button>
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-white/98 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 dark:border-slate-700 dark:bg-slate-950/98">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} version={version} />

      {!shareMode && <Footer />}
    </div>
  )
}

export default App
