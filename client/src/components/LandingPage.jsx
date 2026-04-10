import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead.jsx';

export const LandingPage = () => {
  const planningBenefits = [
    {
      title: 'Betreuungslücken früh sehen',
      text: 'Erkenne sofort, an welchen Ferientagen Betreuung fehlt und wo ihr Urlaub, Familie oder Betreuung organisieren müsst.',
    },
    {
      title: 'Für berufstätige Eltern gemacht',
      text: 'Schulferien, Arbeitstage, Urlaub und freie Tage landen in einer gemeinsamen Jahresübersicht statt in Chats und Zetteln.',
    },
    {
      title: 'Schnell mit Partner teilen',
      text: 'Ein Kalender-Link, gemeinsame Farben und klare Zuständigkeiten helfen euch, die Betreuung als Familie abzustimmen.',
    },
  ];

  const workflowSteps = [
    'Bundesland und Kinder einmal anlegen',
    'Urlaub, freie Tage und Betreuung eintragen',
    'Lücken in der Ferienbetreuung sofort erkennen',
    'Kalender mit Partner oder Familie teilen',
  ];

  const useCases = [
    'Ferienbetreuung in den Schulferien planen',
    'Brückentage und Urlaubstage sinnvoll verteilen',
    'Oma/Opa, Hort oder andere Betreuung mitdenken',
    'Jahresübersicht für Gespräche mit Partner oder Arbeitgeber',
  ];

  const faqItems = [
    {
      question: 'Für wen ist Mein Ferienplaner gedacht?',
      answer: 'Vor allem für berufstätige Eltern, die Schulferien, Urlaub und Betreuung gemeinsam planen möchten.',
    },
    {
      question: 'Kann ich Betreuungslücken sehen?',
      answer: 'Ja. Die App hilft euch dabei, freie Tage und unbetreute Zeiträume sichtbar zu machen, damit ihr rechtzeitig reagieren könnt.',
    },
    {
      question: 'Ist der Kalender nur für ein Kind?',
      answer: 'Nein. Ihr könnt mehrere Kinder mit eigenen Farben und Typen anlegen und alles in einer gemeinsamen Übersicht verwalten.',
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Mein Ferienplaner',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    description: 'Mein Ferienplaner hilft berufstätigen Eltern dabei, Betreuung in den Schulferien, Urlaub und freie Tage gemeinsam zu planen.',
    url: 'https://mein-ferienplaner.de/',
    image: 'https://mein-ferienplaner.de/icon-512.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead
        title="Betreuung planen für berufstätige Eltern"
        description="Mein Ferienplaner hilft berufstätigen Eltern dabei, Betreuung in den Schulferien, Urlaub, freie Tage und Familienkalender gemeinsam zu planen."
        path="/"
        structuredData={structuredData}
      />

      <div className="mx-auto w-full max-w-6xl">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <img src="/app-icon.png" alt="Mein Ferienplaner Logo" className="h-12 w-12 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" />
              <div className="min-w-0">
                <div className="text-2xl font-black tracking-tight">Mein Ferienplaner</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Betreuung planen in Schulferien, an Brückentagen und bei freien Tagen.
                </div>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200">
              Für berufstätige Eltern
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Betreuung planen, bevor die Ferien euch überraschen.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-200">
              Mein Ferienplaner ist ein Familienkalender für berufstätige Eltern. Ihr seht auf einen Blick, wie Schulferien, Urlaub, freie Tage und Betreuung zusammenpassen und wo noch Betreuungslücken offen sind.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {planningBenefits.map((item) => (
                <article key={item.title} className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Betreuung jetzt planen
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Direkt zum Familienkalender
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Ihr bekommt einen persönlichen Kalender-Link, über den ihr später direkt wieder einsteigen könnt. Ideal, wenn beide Elternteile die Betreuung gemeinsam organisieren.
            </p>
          </div>

          <section className="order-1 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/50 lg:order-2" aria-labelledby="landing-mobile-preview">
            <div className="rounded-[1.75rem] bg-slate-950 p-4 text-slate-50 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Mobile Übersicht</div>
                  <h2 id="landing-mobile-preview" className="mt-2 text-xl font-black">Betreuung im Blick</h2>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Status</div>
                  <div className="text-sm font-extrabold text-amber-300">2 Tage offen</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-white/8 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Diese Woche</div>
                  <div className="mt-2 grid gap-2">
                    <div className="flex items-center justify-between rounded-2xl bg-white/8 px-3 py-3">
                      <div>
                        <div className="text-sm font-bold">Osterferien</div>
                        <div className="text-xs text-slate-300">Mi bis Fr Betreuung offen</div>
                      </div>
                      <div className="rounded-full bg-rose-400/20 px-2.5 py-1 text-[11px] font-extrabold text-rose-200">Lücke</div>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/8 px-3 py-3">
                      <div>
                        <div className="text-sm font-bold">Urlaub Elternteil 1</div>
                        <div className="text-xs text-slate-300">Mo und Di abgedeckt</div>
                      </div>
                      <div className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-extrabold text-emerald-200">Passt</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-sky-400/12 p-4">
                    <h3 className="text-sm font-extrabold text-sky-200">So plant ihr</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-200">
                      {workflowSteps.map((step) => (
                        <li key={step} className="rounded-2xl bg-white/8 px-3 py-2">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-white/8 p-4">
                    <h3 className="text-sm font-extrabold text-white">Typische Nutzung</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-200">
                      {useCases.map((item) => (
                        <li key={item} className="rounded-2xl bg-white/8 px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40" aria-labelledby="landing-why">
            <h2 id="landing-why" className="text-2xl font-black tracking-tight">Warum das für berufstätige Eltern hilft</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Wenn Kita, Schule, Urlaubstage, Großeltern und Arbeitsalltag gleichzeitig koordiniert werden müssen, wird Betreuung planen schnell unübersichtlich. Genau dafür ist Mein Ferienplaner gemacht: weniger Abstimmungschaos, mehr Überblick.
            </p>
            <div className="mt-5 grid gap-3">
              <article className="rounded-2xl bg-slate-50 px-4 py-4 text-sm dark:bg-slate-950/40">
                <h3 className="font-extrabold">Schulferien und Betreuung zusammen sehen</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Ferienzeiten, Urlaub und freie Tage landen in einer Ansicht statt in mehreren Kalendern.</p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-4 text-sm dark:bg-slate-950/40">
                <h3 className="font-extrabold">Besser abstimmen</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Partner, Familie oder Betreuungspersonen können denselben Kalender nutzen und Entscheidungen schneller treffen.</p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-4 text-sm dark:bg-slate-950/40">
                <h3 className="font-extrabold">Frühzeitig handeln</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Wenn ihr offene Betreuung seht, könnt ihr früher Urlaub beantragen oder Alternativen organisieren.</p>
              </article>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40" aria-labelledby="landing-faq">
            <h2 id="landing-faq" className="text-2xl font-black tracking-tight">Häufige Fragen</h2>
            <div className="mt-5 grid gap-3">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>&copy; {new Date().getFullYear()} Mein Ferienplaner</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link to="/hilfe" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Hilfe</Link>
              <Link to="/impressum" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Impressum</Link>
              <Link to="/datenschutz" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Datenschutzerklärung</Link>
              <Link to="/cookies" className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Cookiehinweis</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};
