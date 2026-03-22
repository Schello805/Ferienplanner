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

  return (
    <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden px-2 py-2 transition-colors duration-300 sm:px-3 sm:py-3">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
      />

      <main className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 flex-1">
          <CalendarView
            p1Color={p1Color}
            p2Color={p2Color}
            careColor={careColor}
            stateCode={stateCode}
            stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
            p1RecurringRules={p1RecurringRules}
            p2RecurringRules={p2RecurringRules}
            onApiStatusChange={setApiOnline}
            onStatsChange={(stats) => setTotalNetHolidays(stats.totalNetHolidays)}
            onHolidayBreakdownChange={setHolidayBreakdown}
          />
        </div>

        <UtilitySidebar
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

      <Footer />
    </div>
  )
}

export default App
