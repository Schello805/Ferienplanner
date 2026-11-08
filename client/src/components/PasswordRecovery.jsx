import { useEffect, useState } from 'react';
import { requestJson } from '../lib/api.js';
import { SeoHead } from './SeoHead.jsx';

export const PasswordRecovery = ({ reset = false, onBack }) => {
  const [token] = useState(() => reset ? new URLSearchParams(window.location.hash.slice(1)).get('token') || '' : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (reset && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [reset]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (reset && password !== confirmation) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const data = await requestJson(`/api/auth/${reset ? 'reset-password' : 'forgot-password'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, newPassword: password } : { email: email.trim() }),
      });
      setPassword(''); setConfirmation('');
      setMessage(reset ? `Dein Passwort wurde geändert. Melde dich mit deinem Benutzernamen „${data.username}“ und dem neuen Passwort an.` : data.message);
    } catch (failure) {
      setError(failure.message || 'Anfrage fehlgeschlagen. Bitte erneut versuchen.');
    } finally { setBusy(false); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <SeoHead title="Passwort zurücksetzen" path="/passwort-zuruecksetzen" robots="noindex,nofollow" />
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <h1 className="text-xl font-bold">{reset ? 'Neues Passwort festlegen' : 'Passwort vergessen?'}</h1>
        <p>{reset ? 'Mindestens 8 Zeichen, Buchstaben und Zahlen. Dein Benutzername darf nicht im Passwort vorkommen.' : 'Gib die bestätigte E-Mail-Adresse deines Kontos ein. Wir schicken dir einen einmalig nutzbaren Link, der 30 Minuten gültig ist. Bitte auch im Spam-Ordner nachsehen.'}</p>
        {message ? <p role="status">{message}</p> : reset && !token ? <p role="alert">Der Link fehlt. Öffne bitte den vollständigen Link aus der E-Mail oder fordere einen neuen an.</p> : (
          <form onSubmit={submit} className="space-y-4">
            {reset ? <>
              <label className="block">Neues Passwort<input required minLength={8} maxLength={1024} className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <label className="block">Passwort wiederholen<input required minLength={8} maxLength={1024} className={inputClass} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            </> : <label className="block">E-Mail-Adresse<input required maxLength={254} className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
            {error && <p role="alert" className="text-red-600 dark:text-red-300">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-50" type="submit">{busy ? 'Bitte warten…' : reset ? 'Passwort speichern' : 'Link anfordern'}</button>
          </form>
        )}
        {onBack ? <button type="button" className="min-h-11 underline" onClick={onBack}>Zurück zur Anmeldung</button> : <a className="inline-flex min-h-11 items-center underline" href="/app">Zur Anmeldung / neuen Link anfordern</a>}
      </section>
    </main>
  );
};
