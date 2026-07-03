import React from 'react';
import { requestJson } from '../lib/api';
import { LAYERS } from '../lib/layers.js';

export const FeedbackModal = ({ open, onClose }) => {
  const [kind, setKind] = React.useState('feedback');
  const [contact, setContact] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState({ tone: '', message: '' });

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    setStatus({ tone: '', message: '' });
  }, [open]);

  const resetAndClose = () => {
    setKind('feedback');
    setContact('');
    setMessage('');
    setWebsite('');
    setStatus({ tone: '', message: '' });
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
      setStatus({ tone: 'error', message: 'Bitte beschreibe dein Feedback oder den Fehler etwas genauer.' });
      return;
    }

    setSending(true);
    setStatus({ tone: '', message: '' });

    try {
      await requestJson('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          contact,
          message: trimmedMessage,
          website,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      }, 'Feedback konnte nicht gesendet werden');

      setStatus({ tone: 'success', message: 'Danke. Dein Feedback wurde gesendet.' });
      setTimeout(() => {
        resetAndClose();
      }, 900);
    } catch (error) {
      setStatus({ tone: 'error', message: error?.message || 'Feedback konnte nicht gesendet werden.' });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center bg-black/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6"
      style={{ zIndex: LAYERS.modalBackdrop + 20 }}
      onMouseDown={resetAndClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Feedback senden"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-5">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Feedback senden</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Einfach, direkt und auch ohne Login nutzbar.</div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Schließen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-auto px-4 py-4 sm:px-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind('feedback')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${kind === 'feedback' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
              >
                Feedback
              </button>
              <button
                type="button"
                onClick={() => setKind('bug')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${kind === 'bug' ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
              >
                Bug melden
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Kontaktdaten für Rückfragen (freiwillig)</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="E-Mail, Telefon oder Name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Deine Nachricht</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={kind === 'bug' ? 'Was genau ist passiert? Was hättest du erwartet?' : 'Was gefällt dir, was fehlt oder was würdest du dir wünschen?'}
                className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors focus:border-sky-400 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="hidden">
              <span>Website</span>
              <input
                type="text"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>

            {status.message && (
              <div className={`rounded-xl border px-3 py-2 text-sm ${
                status.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100'
                  : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100'
              }`}>
                {status.message}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={sending}
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Sende…' : 'Senden'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
