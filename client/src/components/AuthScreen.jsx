import { useState } from 'react';
import { getSiteHostLabel, getSiteUrl } from '../lib/site.js';

export const AuthScreen = ({ setupRequired, onSubmit, loading, statusNotice = null }) => {
  const [mode, setMode] = useState(setupRequired ? 'setup' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const effectiveMode = setupRequired ? 'setup' : mode;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!username.trim() || !password) {
      setLocalError('Bitte Benutzername und Passwort angeben.');
      return;
    }

    if ((effectiveMode === 'setup' || effectiveMode === 'register') && password !== confirmPassword) {
      setLocalError('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (effectiveMode === 'register' && !email.trim()) {
      setLocalError('Bitte E-Mail-Adresse angeben.');
      return;
    }

    await onSubmit({
      mode: effectiveMode,
      username: username.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-950/92 dark:shadow-black/20">
        <div className="mb-5">
          <div className="mb-4 flex items-center gap-3">
            <a
              href={getSiteUrl()}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1 shadow-lg shadow-slate-200/80 ring-1 ring-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:ring-slate-800 dark:hover:bg-slate-800"
              title={`${getSiteHostLabel()} öffnen`}
            >
              <img src="/ferienplaner-logo-2026.png" alt="Mein Ferienplaner Logo" className="h-14 w-14 rounded-xl object-cover" />
            </a>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mein Ferienplaner</h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Familienkalender als Web-App
              </p>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {setupRequired
              ? 'Ersten Benutzer anlegen und diese Installation absichern.'
              : effectiveMode === 'register' ? 'Neues Benutzerkonto erstellen.' : 'Mit deinem Benutzerkonto anmelden.'}
          </p>
        </div>

        <div className="mb-5 space-y-2">
          {statusNotice && (
            <div className={`rounded-2xl px-3 py-2 text-xs ${
              statusNotice.tone === 'warning'
                ? 'border border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
                : 'border border-red-200/80 bg-red-50/80 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100'
            }`}>
              <div className="font-semibold">{statusNotice.title || 'Hinweis'}</div>
              {statusNotice.message && <div className="mt-1 opacity-80">{statusNotice.message}</div>}
            </div>
          )}
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
            <div className="font-semibold">Dein Konto schützt deinen Kalender</div>
            <div className="mt-1 opacity-80">
              Urlaub, Kinder, Regeln und freie Tage sind an dein Benutzerkonto und den zugehörigen Kalender gebunden.
            </div>
          </div>
          {setupRequired && (
            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100">
              <div className="font-semibold">Erster Start</div>
              <div className="mt-1 opacity-80">
                Nach dem Setup wird automatisch dein Hauptkalender angelegt. Verwende ein Passwort mit mindestens 8 Zeichen, Buchstaben und Zahlen.
              </div>
            </div>
          )}
          {!setupRequired && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${effectiveMode === 'login' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${effectiveMode === 'register' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
              >
                Registrieren
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            App-Installation: Auf iPhone oder Android kannst du die Seite später über das Browser-Menü zum Homescreen hinzufügen.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Benutzername</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              autoComplete="username"
            />
          </label>

          {effectiveMode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">E-Mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoComplete="email"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              autoComplete={effectiveMode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {(effectiveMode === 'setup' || effectiveMode === 'register') && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Passwort wiederholen</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoComplete="new-password"
              />
            </label>
          )}

          {localError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100">
              {localError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? 'Bitte warten…' : effectiveMode === 'setup' ? 'Benutzer anlegen' : effectiveMode === 'register' ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
};
