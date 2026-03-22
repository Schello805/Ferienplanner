import { useState, useEffect } from 'react'
import CalendarView from './components/CalendarView'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { UtilitySidebar } from './components/UtilitySidebar'
import { Toaster } from 'sonner'
import { toast } from 'sonner'
import { GERMAN_STATE_MAP } from './constants/germanStates'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

const formatLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

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
    localStorage.setItem('p1RecurringRules', JSON.stringify(p1RecurringRules));
    localStorage.setItem('p2RecurringRules', JSON.stringify(p2RecurringRules));
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

  const loadFamilyData = async () => {
    try {
      const [childrenRes, freeDaysRes] = await Promise.all([
        fetch(`${API_URL}/api/children`),
        fetch(`${API_URL}/api/child-free-days`),
      ]);

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
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

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
      id: 'general',
      label: 'Allgemein',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
      id: 'parents',
      label: 'Eltern',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75a17.93 17.93 0 0 1-7.5-1.632Z" />
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
      id: 'help',
      label: 'Hilfe',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 17.25h.008v.008H12v-.008Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
  ];

  const activeMobileNav = !isMobile || !sidebarOpen ? 'calendar' : sidebarTab;

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

  return (
    <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden px-2 py-2 transition-colors duration-300 sm:px-3 sm:py-3">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
        shareMode={shareMode}
        onToggleShareMode={toggleShareMode}
        onCopyShareLink={copyShareLink}
      />

      {shareMode && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-sky-900 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100">
          <div>
            <div className="font-semibold">Freigabeansicht aktiv</div>
            <div className="text-xs opacity-80">Kompakt, schreibgeschützt und bereit zum Teilen.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-slate-950 dark:text-sky-100 dark:hover:bg-sky-950/40"
            >
              Link kopieren
            </button>
            <button
              type="button"
              onClick={() => setShareMode(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Freigabe beenden
            </button>
          </div>
        </div>
      )}

      <main className={`flex min-h-0 flex-1 gap-3 ${isMobile && !shareMode ? 'pb-24' : ''}`}>
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
            p2Color={p2Color}
            careColor={careColor}
            setP1Color={setP1Color}
            setP2Color={setP2Color}
            setCareColor={setCareColor}
            stateCode={stateCode}
            setStateCode={setStateCode}
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
          />
        )}
      </main>

      {isMobile && !shareMode && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/96">
          <div className="mx-auto grid max-w-xl grid-cols-6 gap-2">
            {mobileNavItems.map((item) => {
              const active = activeMobileNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'calendar') {
                      setSidebarOpen(false);
                      return;
                    }
                    setSidebarTab(item.id);
                    setSidebarOpen(true);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {!shareMode && <Footer />}
    </div>
  )
}

export default App
