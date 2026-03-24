import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LandingPage } from './components/LandingPage.jsx';
import App from './App.jsx';

const CalendarSlugRoute = () => {
  const { slug } = useParams();

  if (typeof window !== 'undefined' && slug) {
    try {
      localStorage.setItem('ferienplanerTargetSlug', String(slug));
    } catch {
      // ignore storage errors
    }
  }

  return <Navigate to="/app" replace />;
};

export const RootApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<App />} />
        <Route path="/k/:slug" element={<CalendarSlugRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
