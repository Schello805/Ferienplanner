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

  // Days Off State (Array of numbers 0-6, where 0 is Sunday)
  const [p1DaysOff, setP1DaysOff] = useState(() => {
    const saved = localStorage.getItem('p1DaysOff');
    return saved ? JSON.parse(saved) : [];
  });
  const [p2DaysOff, setP2DaysOff] = useState(() => {
    const saved = localStorage.getItem('p2DaysOff');
    return saved ? JSON.parse(saved) : [];
  });
  const [p1RecurringRule, setP1RecurringRule] = useState(() => {
    const saved = localStorage.getItem('p1RecurringRule');
    return saved ? JSON.parse(saved) : createDefaultRecurringRule();
  });
  const [p2RecurringRule, setP2RecurringRule] = useState(() => {
    const saved = localStorage.getItem('p2RecurringRule');
    return saved ? JSON.parse(saved) : createDefaultRecurringRule();
  });

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [sidebarTab, setSidebarTab] = useState('legend');
  const [stateCode, setStateCode] = useState(() => localStorage.getItem('stateCode') || 'BY');
  const [totalNetHolidays, setTotalNetHolidays] = useState(0);
  const [holidayBreakdown, setHolidayBreakdown] = useState([]);

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

  // Days Off Persistence Effect
  useEffect(() => {
    localStorage.setItem('p1DaysOff', JSON.stringify(p1DaysOff));
    localStorage.setItem('p2DaysOff', JSON.stringify(p2DaysOff));
  }, [p1DaysOff, p2DaysOff]);

  useEffect(() => {
    localStorage.setItem('p1RecurringRule', JSON.stringify(p1RecurringRule));
    localStorage.setItem('p2RecurringRule', JSON.stringify(p2RecurringRule));
  }, [p1RecurringRule, p2RecurringRule]);

  useEffect(() => {
    localStorage.setItem('stateCode', stateCode);
  }, [stateCode]);

  return (
    <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden px-2 py-2 transition-colors duration-300 sm:px-3 sm:py-3">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
        onOpenSettings={() => {
          setSidebarTab('settings');
          setSidebarOpen(true);
        }}
        onOpenHelp={() => {
          setSidebarTab('help');
          setSidebarOpen(true);
        }}
      />

      <main className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 flex-1">
          <CalendarView
            p1Color={p1Color}
            p2Color={p2Color}
            careColor={careColor}
            stateCode={stateCode}
            stateName={GERMAN_STATE_MAP[stateCode] || 'Bayern'}
            p1DaysOff={p1DaysOff}
            p2DaysOff={p2DaysOff}
            p1RecurringRule={p1RecurringRule}
            p2RecurringRule={p2RecurringRule}
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
          totalNetHolidays={totalNetHolidays}
          holidayBreakdown={holidayBreakdown}
          p1DaysOff={p1DaysOff}
          setP1DaysOff={setP1DaysOff}
          p1RecurringRule={p1RecurringRule}
          setP1RecurringRule={setP1RecurringRule}
          p2DaysOff={p2DaysOff}
          setP2DaysOff={setP2DaysOff}
          p2RecurringRule={p2RecurringRule}
          setP2RecurringRule={setP2RecurringRule}
        />
      </main>

      <Footer />
    </div>
  )
}

export default App
