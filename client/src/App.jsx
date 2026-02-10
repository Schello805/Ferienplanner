import { useState, useEffect } from 'react'
import CalendarView from './components/CalendarView'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { SettingsModal } from './components/SettingsModal'
import { HelpModal } from './components/HelpModal'
import { Toaster } from 'sonner'

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

  // Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 transition-colors duration-300 flex flex-col max-w-[1600px] mx-auto">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <main className="flex-1">
        <CalendarView
          p1Color={p1Color}
          p2Color={p2Color}
          careColor={careColor}
          setP1Color={setP1Color}
          setP2Color={setP2Color}
          setCareColor={setCareColor}
          p1DaysOff={p1DaysOff}
          p2DaysOff={p2DaysOff}
        />
      </main>

      <Footer />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        p1Color={p1Color}
        setP1Color={setP1Color}
        p2Color={p2Color}
        setP2Color={setP2Color}
        careColor={careColor}
        setCareColor={setCareColor}
        p1DaysOff={p1DaysOff}
        setP1DaysOff={setP1DaysOff}
        p2DaysOff={p2DaysOff}
        setP2DaysOff={setP2DaysOff}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  )
}

export default App
