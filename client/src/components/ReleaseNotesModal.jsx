import React from 'react';
import { RELEASE_NOTES } from '../lib/releaseNotes.js';

const features = [
  {
    title: 'Nahtlos ins nächste Jahr',
    text: 'Auf dem Smartphone führt der Monatswechsel nach Dezember jetzt direkt in den Januar des Folgejahres.',
  },
  {
    title: 'Feiertage passend zur Familie',
    text: 'Für Papa, Mama und jedes Kind lässt sich einzeln festlegen, ob gesetzliche Feiertage automatisch als freie Tage gelten.',
  },
  {
    title: 'Genauere Urlaubsberechnung',
    text: 'Ein Urlaubstag an einem Feiertag wird nur dann nicht berechnet, wenn der Feiertag für den jeweiligen Elternteil frei ist.',
  },
  {
    title: 'Betreuung bleibt übersichtlich',
    text: 'Gesetzliche Feiertage lösen weiterhin keine Betreuungslücke aus. Standardmäßig sind Feiertage für alle Familienmitglieder aktiviert.',
  },
];

export const ReleaseNotesModal = ({ open, onClose, version }) => {
  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <section
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-sky-200/70 bg-white shadow-2xl dark:border-sky-900/60 dark:bg-slate-950"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
      >
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 px-5 py-5 dark:border-slate-800 dark:from-sky-950/60 dark:via-slate-950 dark:to-amber-950/30 sm:px-7 sm:py-6">
          <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-sky-300/25 blur-2xl dark:bg-sky-500/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">Was ist neu?</div>
              <h2 id="release-notes-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Release {RELEASE_NOTES.release}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                {RELEASE_NOTES.date} · Revision {version}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Neuerungen schließen"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-7 sm:py-6">
          {features.map((feature, index) => (
            <div key={feature.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-slate-950">
                {index + 1}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{feature.text}</p>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
          >
            Verstanden, los geht’s
          </button>
          <p className="text-center text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            Dieser Hinweis erscheint für Release {RELEASE_NOTES.release} nur einmal. Alle Änderungen bleiben im Changelog verfügbar.
          </p>
        </div>
      </section>
    </div>
  );
};
