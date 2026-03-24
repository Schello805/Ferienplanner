import { Link } from 'react-router-dom';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <img src="/app-icon.png" alt="Mein Ferienplaner Logo" className="h-12 w-12 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" />
              <div className="min-w-0">
                <div className="text-2xl font-black tracking-tight">Mein Ferienplaner</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Jahresübersicht für Schulferien, Urlaub und Betreuung – für Familien.
                </div>
              </div>
            </div>

            <div className="mt-6 text-4xl font-black tracking-tight">
              Ein Kalender für Ferienplanung, Urlaub und Betreuung.
            </div>
            <div className="mt-3 text-base text-slate-700 dark:text-slate-200">
              Richte deine Familie einmal ein (Bundesland, Papa/Mama, Kinder, Farben) – danach planst du jedes Jahr schnell weiter.
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Einrichtung starten
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Direkt zum Kalender
              </Link>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Du bekommst einen persönlichen Kalender-Link (z.B. <span className="font-mono">/k/familie-mueller</span>), über den du später direkt wieder einsteigen kannst.
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="text-base font-bold">So funktioniert’s</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                <div className="font-semibold">Stammdaten</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Kinder, Papa/Mama, Farben, Regeln</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                <div className="font-semibold">Jahresdaten</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Urlaub, freie Tage, Betreuung</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                <div className="font-semibold">Teilen</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Einladungen & Ansicht-Links</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                <div className="font-semibold">Drucken</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">A4 Übersicht für die Wand</div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <a
                href="https://mein-ferienplaner.de/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                mein-ferienplaner.de
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>&copy; {new Date().getFullYear()} Mein Ferienplaner</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link to="/impressum" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Impressum</Link>
              <Link to="/datenschutz" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Datenschutzerklärung</Link>
              <Link to="/cookies" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Cookiehinweis</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
