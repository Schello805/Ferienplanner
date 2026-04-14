import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COOKIE_CONSENT_ACCEPTED, COOKIE_CONSENT_REJECTED, getCookieConsentChoice, setCookieConsentChoice } from '../lib/consent.js';

export const CookieConsentBanner = () => {
  const [choice, setChoice] = useState(() => getCookieConsentChoice());
  if (choice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-4 pb-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Cookies & Statistik</div>
            <div className="mt-2 text-lg font-black tracking-tight">Nur notwendige Cookies sind sofort aktiv.</div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Für Login und sichere Nutzung setzen wir notwendige Session-Cookies ein. Matomo zur Reichweitenmessung wird erst geladen,
              wenn du zustimmst.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => setChoice(setCookieConsentChoice(COOKIE_CONSENT_ACCEPTED))}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
            >
              Statistik erlauben
            </button>
            <button
              type="button"
              onClick={() => setChoice(setCookieConsentChoice(COOKIE_CONSENT_REJECTED))}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Nur notwendige Cookies
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/cookies" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Cookiehinweis
          </Link>
          <Link to="/datenschutz" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Datenschutz
          </Link>
          <span>
            Aktueller Status: <strong>{choice || 'offen'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
