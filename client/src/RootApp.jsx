import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LandingPage } from './components/LandingPage.jsx';
import { SetupWizard } from './components/SetupWizard.jsx';
import { ImprintPage } from './components/ImprintPage.jsx';
import { PrivacyPage } from './components/PrivacyPage.jsx';
import { CookiePage } from './components/CookiePage.jsx';
import { HelpPage } from './components/HelpPage.jsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.jsx';
import App from './App.jsx';
import { setStoredCalendarSlug } from './lib/api.js';

const CalendarSlugRoute = () => {
  const { slug } = useParams();

  if (typeof window !== 'undefined' && slug) {
    try {
      setStoredCalendarSlug(String(slug));
    } catch {
      // ignore storage errors
    }
  }

  return <Navigate to="/app" replace />;
};

export const RootApp = () => {
  return (
    <BrowserRouter>
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/impressum" element={<ImprintPage />} />
          <Route path="/datenschutz" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiePage />} />
          <Route path="/hilfe" element={<HelpPage />} />
          <Route path="/app" element={<App />} />
          <Route path="/k/:slug" element={<CalendarSlugRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieConsentBanner />
      </>
    </BrowserRouter>
  );
};
