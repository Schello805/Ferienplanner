import { useState } from 'react';
import { COOKIE_CONSENT_ACCEPTED, COOKIE_CONSENT_REJECTED, getCookieConsentChoice, setCookieConsentChoice } from '../lib/consent.js';
import { LegalPage } from './LegalPage.jsx';

export const CookiePage = () => {
  const [consentChoice, setConsentChoice] = useState(() => getCookieConsentChoice());

  return (
    <LegalPage
      title="Cookiehinweis"
      description="Informationen zu technisch notwendigen Cookies und lokal gespeicherten Einstellungen in Mein Ferienplaner."
      path="/cookies"
    >
      <div className="space-y-4">
        <div>
          <div className="font-extrabold">Cookies</div>
          <div className="mt-2 space-y-2">
            <div>
              Diese Webapp verwendet technisch notwendige Session-Cookies für Anmeldung, Sitzungsverwaltung und sichere Nutzung der Anwendung.
            </div>
            <div>
              Zusätzlich kann Matomo zur Reichweitenmessung eingesetzt werden. Dabei können je nach Konfiguration Analyse-Cookies oder vergleichbare Technologien
              verwendet werden.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Einwilligung</div>
          <div className="mt-2 space-y-2">
            <div>
              Technisch notwendige Cookies werden ohne gesonderte Einwilligung eingesetzt, da sie für den Betrieb der Webapp erforderlich sind.
            </div>
            <div>
              Matomo wird nur nach vorheriger Einwilligung aktiviert. Ohne Zustimmung bleibt die Webanalyse deaktiviert.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Aktuelle Auswahl verwalten</div>
          <div className="mt-2 space-y-3">
            <div>
              Aktueller Status:{' '}
              <strong>
                {consentChoice === COOKIE_CONSENT_ACCEPTED
                  ? 'Statistik erlaubt'
                  : consentChoice === COOKIE_CONSENT_REJECTED
                    ? 'nur notwendige Cookies'
                    : 'noch keine Auswahl'}
              </strong>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConsentChoice(setCookieConsentChoice(COOKIE_CONSENT_ACCEPTED))}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-sky-400"
              >
                Statistik erlauben
              </button>
              <button
                type="button"
                onClick={() => setConsentChoice(setCookieConsentChoice(COOKIE_CONSENT_REJECTED))}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Nur notwendige Cookies
              </button>
            </div>
            <div>
              Deine Auswahl wird lokal im Browser gespeichert und kann jederzeit über diese Seite geändert werden.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">LocalStorage</div>
          <div className="mt-2 space-y-2">
            <div>
              Im Browser können Einstellungen wie Farben, Bundesland oder andere App-Präferenzen gespeichert werden, damit die App bequem nutzbar bleibt.
            </div>
            <div>
              Du kannst LocalStorage in deinem Browser jederzeit löschen; danach gehen nur lokal gespeicherte Einstellungen verloren und müssen gegebenenfalls neu gesetzt werden.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
