import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { CookieConsentBanner } from './components/CookieConsentBanner.jsx';
import { setStoredCalendarSlug } from './lib/api.js';

const LandingPage = lazy(() => import('./components/LandingPage.jsx').then((module) => ({ default: module.LandingPage })));
const SetupWizard = lazy(() => import('./components/SetupWizard.jsx').then((module) => ({ default: module.SetupWizard })));
const ImprintPage = lazy(() => import('./components/ImprintPage.jsx').then((module) => ({ default: module.ImprintPage })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage.jsx').then((module) => ({ default: module.PrivacyPage })));
const CookiePage = lazy(() => import('./components/CookiePage.jsx').then((module) => ({ default: module.CookiePage })));
const HelpPage = lazy(() => import('./components/HelpPage.jsx').then((module) => ({ default: module.HelpPage })));
const App = lazy(() => import('./App.jsx'));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900">
      Seite wird geladen…
    </div>
  </div>
);

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

const RootRoute = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasInviteToken = Boolean(params.get('invite'));

  if (hasInviteToken) {
    return <Navigate to={`/app${location.search}${location.hash}`} replace />;
  }

  return <LandingPage />;
};

export const RootApp = () => {
  return (
    <BrowserRouter>
      <>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="/impressum" element={<ImprintPage />} />
            <Route path="/datenschutz" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiePage />} />
            <Route path="/hilfe" element={<HelpPage />} />
            <Route path="/app" element={<App />} />
            <Route path="/k/:slug" element={<CalendarSlugRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <CookieConsentBanner />
      </>
    </BrowserRouter>
  );
};
