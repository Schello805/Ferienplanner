import { LegalPage } from './LegalPage.jsx';

export const PrivacyPage = () => {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      description="Datenschutzhinweise zur Verarbeitung von Kontodaten, Kalenderdaten und E-Mail-Versand in Mein Ferienplaner."
      path="/datenschutz"
    >
      <div className="space-y-4">
        <div>
          <div className="font-extrabold">Verantwortlicher</div>
          <div className="mt-2 space-y-1">
            <div>Michael Schellenberger</div>
            <div>Ziegeleistrasse, 91572 Bechhofen, Deutschland</div>
            <div>E-Mail: info@schellenberger.biz</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Welche Daten verarbeite ich?</div>
          <div className="mt-2 space-y-2">
            <div>
              Für die Nutzung der Webapp wird ein Benutzerkonto benötigt. Dabei werden z.B. Benutzername, E-Mail-Adresse
              (falls angegeben), sowie Kalenderdaten (Kinder, Einträge, Freigaben) gespeichert.
            </div>
            <div>
              Technisch notwendige Server-Logs können IP-Adresse, Zeitpunkt, aufgerufene URL und User-Agent enthalten
              (abhängig von deiner Server-/Proxy-Konfiguration).
            </div>
            <div>
              Beim Aufruf der Website kann zusätzlich Matomo zur Reichweitenmessung eingesetzt werden. Dabei werden insbesondere
              Seitenaufrufe, technische Browserinformationen, Referrer-Informationen und Nutzungsereignisse verarbeitet.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Hosting / Betrieb</div>
          <div className="mt-2 space-y-2">
            <div>
              Der Dienst wird aktuell privat betrieben (Proxmox-Host, LXC-Container im Heimnetz). Es werden keine externen
              Hosting-Anbieter eingesetzt, sofern nicht ausdrücklich anders angegeben.
            </div>
            <div>
              Proxmox/Container-/Reverse-Proxy-Komponenten können technisch bedingt Protokolldaten erzeugen. Eine gezielte
              Auswertung zu Marketingzwecken findet nicht statt.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Zweck der Verarbeitung</div>
          <div className="mt-2 space-y-2">
            <div>Betrieb der Webapp, Authentifizierung, Verwaltung persönlicher Kalender, Fehleranalyse, Sicherheit und Reichweitenmessung.</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Rechtsgrundlagen</div>
          <div className="mt-2 space-y-2">
            <div>
              Die Verarbeitung zur Bereitstellung der Webapp und zur Verwaltung von Benutzerkonten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO,
              soweit sie für die Nutzung des Dienstes erforderlich ist.
            </div>
            <div>
              Technisch notwendige Sicherheits- und Betriebsmaßnahmen erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            </div>
            <div>
              Soweit Matomo für statistische Auswertungen eingesetzt wird, erfolgt dies nur auf Grundlage einer zuvor erteilten Einwilligung
              gemäß Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 25 Abs. 1 TDDDG.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Speicherdauer</div>
          <div className="mt-2 space-y-2">
            <div>
              Kontodaten und Kalenderdaten werden gespeichert, solange das Konto besteht. Sessions werden zeitlich befristet gespeichert.
            </div>
            <div>
              Server-Logs (sofern vorhanden) werden nur so lange gespeichert, wie es für Betrieb und Sicherheit erforderlich ist.
              Admin-Auditlogs sind nur für Administratoren dieser Installation einsehbar und werden nach 90 Tagen automatisch gelöscht.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">E-Mail-Versand</div>
          <div className="mt-2 space-y-2">
            <div>
              Für Verifikations- und System-E-Mails wird ein SMTP-Server verwendet. Dabei wird mindestens die Empfängeradresse verarbeitet.
              Der Versand erfolgt aktuell über den Domain-/Mailanbieter febas.net (SMTP: mail.febas.net).
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Webanalyse mit Matomo</div>
          <div className="mt-2 space-y-2">
            <div>
              Zur Analyse der Nutzung der Website kann Matomo eingesetzt werden. Anbieter der Erfassungsinstanz ist der Betreiber dieser Website
              über die Domain analytics.schellenberger.biz.
            </div>
            <div>
              Die Auswertung dient dazu, Reichweite, Nutzung und technische Verbesserung der Website besser zu verstehen.
            </div>
            <div>
              Die Aktivierung von Matomo erfolgt nur nach Einwilligung. Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Rechte der betroffenen Personen</div>
          <div className="mt-2 space-y-2">
            <div>Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch.</div>
            <div>
              Die Löschung deines Kontos inklusive Kalender und gespeicherter Daten kannst du direkt in der App im Bereich <strong>Profil</strong> auslösen.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
