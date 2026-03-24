import { LegalPage } from './LegalPage.jsx';

export const PrivacyPage = () => {
  return (
    <LegalPage title="Datenschutzerklärung">
      <div className="space-y-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Hinweis: Diese Datenschutzerklärung ist eine praxisnahe Vorlage und ersetzt keine Rechtsberatung.
          Passe sie an dein Hosting, Logging, E-Mail-Versand und ggf. Analytics an.
        </div>

        <div>
          <div className="font-extrabold">Verantwortlicher</div>
          <div className="mt-2 space-y-1">
            <div>Michael Schellenberger</div>
            <div>[Adresse]</div>
            <div>E-Mail: [kontakt@mein-ferienplaner.de]</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Welche Daten verarbeiten wir?</div>
          <div className="mt-2 space-y-2">
            <div>
              Für die Nutzung der Webapp wird ein Benutzerkonto benötigt. Dabei werden z.B. Benutzername, E-Mail-Adresse
              (falls angegeben), sowie Kalenderdaten (Kinder, Einträge, Freigaben) gespeichert.
            </div>
            <div>
              Technisch notwendige Server-Logs können IP-Adresse, Zeitpunkt, aufgerufene URL und User-Agent enthalten
              (abhängig von deiner Server-/Proxy-Konfiguration).
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Zweck der Verarbeitung</div>
          <div className="mt-2 space-y-2">
            <div>Betrieb der Webapp, Authentifizierung, Verwaltung persönlicher Kalender, Fehleranalyse und Sicherheit.</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Speicherdauer</div>
          <div className="mt-2 space-y-2">
            <div>
              Kontodaten und Kalenderdaten werden gespeichert, solange das Konto besteht. Sessions werden zeitlich befristet gespeichert.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">E-Mail-Versand</div>
          <div className="mt-2 space-y-2">
            <div>
              Für Verifikations- und System-E-Mails wird ein SMTP-Server verwendet. Dabei wird mindestens die Empfängeradresse verarbeitet.
              Die konkrete Verarbeitung hängt vom verwendeten Mailanbieter ab.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Rechte der betroffenen Personen</div>
          <div className="mt-2 space-y-2">
            <div>Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch.</div>
            <div>
              Wenn du möchtest, kann ich dir einen kleinen Admin-Export ergänzen, der Nutzer:innen ihre Kalenderdaten als JSON bereitstellt.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
