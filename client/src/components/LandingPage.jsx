import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead.jsx';
import { buildSiteUrl } from '../lib/site.js';

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
    {
      question: 'Ist Mein Ferienplaner kostenlos?',
      answer: 'Ja. Der Einstieg ist kostenlos, sodass du Schulferien, Urlaub, freie Tage und Betreuung ohne Hürde gemeinsam planen kannst.',
    },
    {
      question: 'Kann ich die App auch für Ferienbetreuung und Hortplanung nutzen?',
      answer: 'Ja. Die App eignet sich auch, um Hort, Großeltern, Tagesbetreuung oder andere Formen der Ferienbetreuung in einer Jahresübersicht mitzudenken.',
    },
  ];

  const helpAnchors = [
    {
      href: '/hilfe#hilfe-schnellstart',
      title: 'Schnellstart',
      text: 'Wie ihr in wenigen Schritten mit Bundesland, Kindern und erster Planung startet.',
    },
    {
      href: '/hilfe#hilfe-rollen',
      title: 'Rollenmodell',
      text: 'Was Owner, Editor und Viewer im Familienkalender genau dürfen.',
    },
    {
      href: '/hilfe#hilfe-teilen',
      title: 'Teilen & Einladen',
      text: 'Wie ihr Partner oder weitere Personen in eure Planung einbindet.',
    },
    {
      href: '/hilfe#hilfe-benachrichtigungen',
      title: 'Benachrichtigungen',
      text: 'Welche E-Mails es gibt und wie ihr Digest und Hinweise steuert.',
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Mein Ferienplaner',
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      description: 'Mein Ferienplaner hilft berufstätigen Eltern dabei, Betreuung in den Schulferien, Urlaub und freie Tage gemeinsam zu planen.',
      url: buildSiteUrl('/'),
      image: buildSiteUrl('/Flyer-Mein-Ferienkalender.png'),
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Mein Ferienplaner',
      url: buildSiteUrl('/'),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.16),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#fff7ed_54%,_#f8fafc_100%)] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-10">
      <SeoHead
        title="Betreuung planen für berufstätige Eltern"
        description="Mein Ferienplaner hilft berufstätigen Eltern dabei, Schulferien, Ferienbetreuung, Urlaub und freie Tage kostenlos in einer gemeinsamen Familienübersicht zu planen."
        path="/"
        structuredData={structuredData}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 sm:gap-12">
        <section className="flex flex-col gap-8 lg:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src="/ferienplaner-logo-2026.png" alt="Mein Ferienplaner Logo" className="h-12 w-12 rounded-2xl border border-white/70 bg-white p-1 shadow-sm" />
              <div className="min-w-0">
                <div className="text-2xl font-black tracking-tight">Mein Ferienplaner</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Betreuung planen in Schulferien, an Brückentagen und bei freien Tagen.
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                Für berufstätige Eltern
              </div>
              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-sky-800 shadow-sm backdrop-blur dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                Kostenlos nutzen
              </div>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.02] dark:text-white">
              Betreuung planen, bevor Ferien, Urlaub und Alltag kollidieren.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 dark:text-slate-200">
              Mein Ferienplaner ist ein One-Stop-Familienkalender für Eltern, die Schule, Beruf und Betreuung zusammen denken müssen. Ihr seht auf einen Blick, wann Schulferien stattfinden, wo Urlaub schon eingeplant ist, welche Ferienbetreuung mitgedacht werden muss und an welchen Tagen Betreuung noch fehlt.
            </p>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-800 dark:text-sky-200">
              Der Einstieg ist kostenlos: Kalender anlegen, Ferien laden, Betreuung planen und die Familienübersicht direkt nutzen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
              >
                Kostenlos Betreuung planen
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Direkt zum Familienkalender
              </Link>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Ihr bekommt einen persönlichen Kalender-Link, über den ihr später direkt wieder einsteigen könnt. So bleibt die Ferien- und Betreuungsplanung nicht an einer Person hängen.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <section className="grid gap-4">
              {quickBenefits.map((item) => (
                <article key={`${item.kicker}-stacked`} className="rounded-[1.75rem] border border-white/70 bg-white/88 px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{item.kicker}</div>
                  <h2 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.text}</p>
                </article>
              ))}
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-preview">
              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
                Produktvorschau
              </div>
              <h2 id="landing-preview" className="mt-3 text-2xl font-black tracking-tight">
                So sieht der Nutzen für eure Planung aus
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Die App bündelt Ferienzeiten, Urlaub und Betreuung in einer Familienlogik. Auf der öffentlichen Startseite zeige ich bewusst keine echte Kalenderansicht, sondern nur die typischen Planungsbausteine.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">So plant ihr</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                    {planningFlow.map((step) => (
                      <li key={step} className="rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">Typische Nutzung</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                    {useCases.slice(0, 4).map((item) => (
                      <li key={item} className="rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
                <div className="font-extrabold">Worauf ihr hinausarbeitet</div>
                <p className="mt-2 leading-7">
                  Eine ruhige, gemeinsame Jahresübersicht, mit der ihr Betreuungslücken früher erkennt und Entscheidungen zu Urlaub, Ferienbetreuung und Familienorganisation besser trefft.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-[2rem] border border-sky-200 bg-sky-50/80 p-6 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20" aria-labelledby="landing-top-cta">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Nächster Schritt</div>
                <h2 id="landing-top-cta" className="mt-2 text-2xl font-black tracking-tight">
                  Erst Überblick schaffen, dann Betreuung konkret planen.
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  Genau dafür ist der Einstieg gedacht: Interesse wecken, Nutzen zeigen und euch dann mit einer klaren Aktion in die eigentliche Planung führen.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/setup"
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
                >
                  Jetzt Betreuung planen
                </Link>
                <Link
                  to="/hilfe"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  Erst Funktionen ansehen
                </Link>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-4 lg:grid-cols-3" aria-labelledby="landing-seo-benefits">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Schulferien planen</div>
            <h2 id="landing-seo-benefits" className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">Schulferien, Urlaub und Betreuung zusammen denken</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Statt Schulferien separat, Urlaubstage separat und Betreuung nur im Kopf zu planen, landet alles in einer gemeinsamen Jahresübersicht.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Ferienbetreuung</div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">Ferienbetreuung früh erkennen statt kurzfristig improvisieren</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Ob Hort, Großeltern oder andere Betreuung: Die App hilft dir, Betreuungslücken in den Ferien rechtzeitig sichtbar zu machen.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Kostenlos starten</div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">Kostenloser Einstieg ohne komplizierten Setup-Prozess</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Du kannst direkt einen Kalender anlegen, Ferien laden und eure Betreuungsplanung aufbauen, ohne erst ein großes Toolset einrichten zu müssen.
            </p>
          </div>
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

        <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-help-links">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Mehr Funktionen ansehen</div>
              <h2 id="landing-help-links" className="mt-2 text-2xl font-black tracking-tight">
                Wenn ihr vor dem Start noch genauer wissen wollt, wie die App funktioniert
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Unten findet ihr die wichtigsten Themen direkt mit Sprungmarken auf die Hilfeseite. So könnt ihr genau dort weiterlesen, wo eure offene Frage gerade liegt.
              </p>
            </div>
            <a
              href="/hilfe"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Ganze Hilfe öffnen
            </a>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {helpAnchors.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-900"
              >
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Hilfe</div>
                <h3 className="mt-2 text-base font-extrabold text-slate-950 dark:text-white">{item.title}</h3>
                <p className="mt-2 leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55" aria-labelledby="landing-faq">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              Orientierung
            </div>
            <h2 id="landing-faq" className="mt-4 text-2xl font-black tracking-tight">Häufige Fragen vor dem Start</h2>
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
              Action
            </div>
            <h2 id="landing-cta" className="mt-4 text-2xl font-black tracking-tight">
              Startet euren Betreuungskalender, bevor die nächste Ferienphase beginnt.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
              Die Seite führt euch jetzt bewusst von Überblick und Nutzen zu Funktionen, Antworten und am Ende wieder zu einer klaren Aktion. So bleibt der Einstieg einfach, auch wenn eure Planung im Alltag komplex ist.
            </p>
            <div className="mt-5 rounded-[1.5rem] border border-white/70 bg-white/75 px-4 py-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              <div className="font-extrabold text-slate-900 dark:text-white">Für euren Start am sinnvollsten</div>
              <p className="mt-2 leading-6">
                Erst den Kalender anlegen, dann Ferien laden und danach gemeinsam Urlaub, freie Tage und Betreuung Schritt für Schritt ergänzen.
              </p>
            </div>
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
