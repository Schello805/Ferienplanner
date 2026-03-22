import { useState, useEffect } from 'react'
import CalendarView from './components/CalendarView'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { UtilitySidebar } from './components/UtilitySidebar'
import { Toaster } from 'sonner'
import { GERMAN_STATE_MAP } from './constants/germanStates'

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
  const [sidebarTab, setSidebarTab] = useState(() => localStorage.getItem('sidebarTab') || 'legend');
  const [holidayTableOpen, setHolidayTableOpen] = useState(() => localStorage.getItem('holidayTableOpen') === 'true');
  const [stateCode, setStateCode] = useState(() => localStorage.getItem('stateCode') || 'BY');
  const [totalNetHolidays, setTotalNetHolidays] = useState(0);
  const [holidayBreakdown, setHolidayBreakdown] = useState([]);
  const [apiOnline, setApiOnline] = useState(true);
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
      id: 'settings',
      label: 'Einstellungen',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

  return (
    <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden px-2 py-2 transition-colors duration-300 sm:px-3 sm:py-3">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
      />

      <main className={`flex min-h-0 flex-1 gap-3 ${isMobile ? 'pb-24' : ''}`}>
        <div className="min-h-0 flex-1">
          <CalendarView
            p1Color={p1Color}
            p2Color={p2Color}
            careColor={careColor}
            stateCode={stateCode}
            stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
            isMobile={isMobile}
            p1RecurringRules={p1RecurringRules}
            p2RecurringRules={p2RecurringRules}
            onApiStatusChange={setApiOnline}
            onStatsChange={(stats) => setTotalNetHolidays(stats.totalNetHolidays)}
            onHolidayBreakdownChange={setHolidayBreakdown}
          />
        </div>

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
          p1RecurringRules={p1RecurringRules}
          setP1RecurringRules={setP1RecurringRules}
          p2RecurringRules={p2RecurringRules}
          setP2RecurringRules={setP2RecurringRules}
        />
      </main>

      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/96">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
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

      <Footer />
    </div>
  )
}

export default App
