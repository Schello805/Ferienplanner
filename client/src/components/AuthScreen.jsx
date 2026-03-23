import { useState } from 'react';

export const AuthScreen = ({ setupRequired, onSubmit, loading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!username.trim() || !password) {
      setLocalError('Bitte Benutzername und Passwort angeben.');
      return;
    }

    if (setupRequired && password !== confirmPassword) {
      setLocalError('Die Passwörter stimmen nicht überein.');
      return;
    }

    await onSubmit({
      username: username.trim(),
      password,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-950/92 dark:shadow-black/20">
        <div className="mb-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1 shadow-lg shadow-slate-200/80 ring-1 ring-white dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:ring-slate-800">
              <img src="/app-icon.png" alt="Ferienplaner Logo" className="h-14 w-14 rounded-xl object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ferienplaner</h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Familienkalender als Web-App
              </p>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {setupRequired
              ? 'Ersten Benutzer anlegen und diese Installation absichern.'
              : 'Mit deinem Benutzerkonto anmelden.'}
          </p>
        </div>

        <div className="mb-5 space-y-2">
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
                Nach dem Setup wird automatisch dein Hauptkalender angelegt. Verwende ein Passwort mit mindestens 10 Zeichen, Buchstaben und Zahlen.
              </div>
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              autoComplete={setupRequired ? 'new-password' : 'current-password'}
            />
          </label>

          {setupRequired && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Passwort wiederholen</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
            {loading ? 'Bitte warten…' : setupRequired ? 'Benutzer anlegen' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
};
