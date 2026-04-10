import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead.jsx';

export const LandingPage = () => {
  const quickBenefits = [
    {
      kicker: 'Mehr Überblick',
      title: 'Seht sofort, wo Betreuung noch fehlt',
      text: 'Schulferien, Urlaub, freie Tage und Betreuung landen in einer gemeinsamen Übersicht statt in mehreren Kalendern, Chats und Notizen.',
    },
    {
      kicker: 'Für Eltern im Alltag',
      title: 'Für berufstätige Eltern gemacht',
      text: 'Wenn beide arbeiten, wird Ferienplanung schnell komplex. Mein Ferienplaner hilft euch dabei, Betreuung realistisch und frühzeitig zu organisieren.',
    },
    {
      kicker: 'Gemeinsam planen',
      title: 'Mit Partner oder Familie abstimmen',
      text: 'Teilt den Familienkalender und sprecht auf Basis einer klaren Jahresübersicht über Urlaub, Brückentage und Betreuung.',
    },
  ];

  const planningFlow = [
    'Bundesland auswählen und Schulferien automatisch laden',
    'Kinder, Farben und Betreuungslogik einmal anlegen',
    'Urlaubstage, freie Tage und Betreuung im Jahresverlauf eintragen',
    'Betreuungslücken früh sehen und gemeinsam lösen',
  ];

  const useCases = [
    'Ferienbetreuung in Bayern oder anderen Bundesländern planen',
    'Urlaubstage mit Schulferien und Brückentagen abstimmen',
    'Oma, Opa, Hort oder Tagesbetreuung in die Planung einbeziehen',
    'Eine klare Übersicht für Gespräche mit Partner oder Arbeitgeber haben',
    'Freie Tage pro Kind und Familie nachvollziehbar dokumentieren',
    'Betreuungsengpässe erkennen, bevor sie zum Problem werden',
  ];

  const reasonCards = [
    {
      title: 'Weniger Abstimmungschaos',
      text: 'Ihr müsst euch nicht mehr durch mehrere Kalender und Nachrichten wühlen, um zu sehen, wer wann verfügbar ist.',
    },
    {
      title: 'Bessere Jahresplanung',
      text: 'Gerade bei langen Ferienblöcken hilft eine Jahresansicht, Urlaub und Betreuung nicht nur kurzfristig, sondern strategisch zu planen.',
    },
    {
      title: 'Klarer Familienkontext',
      text: 'Kinder, Farben, Rollen und Kalender-Link bleiben zusammen, damit ihr jedes Jahr schneller wieder starten könnt.',
    },
  ];

  const faqItems = [
    {
      question: 'Für wen ist Mein Ferienplaner gedacht?',
      answer: 'Vor allem für berufstätige Eltern, die Betreuung in den Schulferien, Urlaub und freie Tage gemeinsam planen möchten.',
    },
    {
      question: 'Hilft die App bei Betreuungslücken?',
      answer: 'Ja. Das Ziel ist genau, unbetreute Tage sichtbar zu machen, damit ihr früh reagieren und Betreuung organisieren könnt.',
    },
    {
      question: 'Kann ich mehrere Kinder verwalten?',
      answer: 'Ja. Ihr könnt mehrere Kinder mit eigenen Farben und Typen anlegen und in einer gemeinsamen Familienübersicht planen.',
    },
    {
      question: 'Kann ich den Kalender teilen?',
      answer: 'Ja. Der Familienkalender kann mit Partner oder weiteren Beteiligten geteilt werden, damit die Planung nicht an einer Person hängen bleibt.',
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
    image: 'https://mein-ferienplaner.de/Flyer-Mein-Ferienkalender.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.16),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#fff7ed_54%,_#f8fafc_100%)] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-10">
      <SeoHead
        title="Betreuung planen für berufstätige Eltern"
        description="Mein Ferienplaner hilft berufstätigen Eltern dabei, Betreuung in den Schulferien, Urlaub, freie Tage und Familienkalender gemeinsam zu planen."
        path="/"
        structuredData={structuredData}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <img src="/app-icon.png" alt="Mein Ferienplaner Logo" className="h-12 w-12 rounded-2xl border border-white/70 bg-white p-1 shadow-sm" />
              <div className="min-w-0">
                <div className="text-2xl font-black tracking-tight">Mein Ferienplaner</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Betreuung planen in Schulferien, an Brückentagen und bei freien Tagen.
                </div>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              Für berufstätige Eltern
            </div>

            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.02] dark:text-white">
              Betreuung planen, bevor Ferien, Urlaub und Alltag kollidieren.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-200">
              Mein Ferienplaner ist ein One-Stop-Familienkalender für Eltern, die Schule, Beruf und Betreuung zusammen denken müssen. Ihr seht auf einen Blick, wann Schulferien stattfinden, wo Urlaub schon eingeplant ist und an welchen Tagen Betreuung noch fehlt.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickBenefits.map((item) => (
                <article key={item.title} className="rounded-[1.75rem] border border-white/70 bg-white/85 px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{item.kicker}</div>
                  <h2 className="mt-2 text-sm font-extrabold text-slate-950 dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
              >
                Betreuung jetzt planen
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Direkt zum Familienkalender
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Ihr bekommt einen persönlichen Kalender-Link, über den ihr später direkt wieder einsteigen könnt. So bleibt die Ferien- und Betreuungsplanung nicht an einer Person hängen.
            </p>
          </div>

          <section className="order-1 rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55 lg:order-2" aria-labelledby="landing-mobile-preview">
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
                      {planningFlow.map((step) => (
                        <li key={step} className="rounded-2xl bg-white/8 px-3 py-2">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-white/8 p-4">
                    <h3 className="text-sm font-extrabold text-white">Typische Nutzung</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-200">
                      {useCases.slice(0, 4).map((item) => (
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

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-why">
            <h2 id="landing-why" className="text-2xl font-black tracking-tight">Warum das im Familienalltag hilft</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Wenn Schule, Kita, Arbeit, Urlaubstage, Großeltern und spontane Änderungen zusammenkommen, wird Betreuung planen schnell unübersichtlich. Ein OnePager mit Jahresübersicht hilft euch, früher zu sehen, wann Handlungsbedarf entsteht.
            </p>
            <div className="mt-5 grid gap-3">
              {reasonCards.map((item) => (
                <article key={item.title} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm dark:bg-slate-950/40">
                  <h3 className="font-extrabold">{item.title}</h3>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/55 dark:bg-none" aria-labelledby="landing-details">
            <h2 id="landing-details" className="text-2xl font-black tracking-tight">Was ihr konkret planen könnt</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {useCases.map((item) => (
                <div key={item} className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[2.25rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-flyer">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
                Auf einen Blick
              </div>
              <h2 id="landing-flyer" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Der Flyer fasst die Idee direkt zusammen
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Wenn ihr die Startseite schnell erfassen wollt, bekommt ihr hier die komprimierte Botschaft: Betreuung planen, Lücken erkennen, Kalender teilen und die Ferien realistisch durchorganisieren.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <img
                src="/Flyer-Mein-Ferienkalender.png"
                alt="Flyer von Mein Ferienplaner mit Fokus auf Betreuung der Schulferien"
                className="block h-auto w-full"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-faq">
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

          <section className="rounded-[2rem] border border-sky-200 bg-sky-50/80 p-6 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20" aria-labelledby="landing-cta">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
              Nächster Schritt
            </div>
            <h2 id="landing-cta" className="mt-4 text-2xl font-black tracking-tight">
              Startet euren Betreuungskalender, bevor die nächste Ferienphase beginnt.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
              Einmal einrichten, später jedes Jahr schneller weiterplanen. Gerade für Familien mit wenig freier Organisationszeit ist das der entscheidende Unterschied.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
              >
                Kostenlos starten
              </Link>
              <Link
                to="/hilfe"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Erst Funktionen ansehen
              </Link>
            </div>
          </section>
        </section>

        <footer className="mt-2 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
