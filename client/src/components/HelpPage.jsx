import { LegalPage } from './LegalPage.jsx';

export const HelpPage = () => {
  return (
    <LegalPage title="Hilfe">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="font-extrabold">Überblick</div>
          <div>
            Mein Ferienplaner ist eine Familien-Kalender-App. Wichtig ist die Unterscheidung zwischen dem <strong>globalen Admin</strong>
            (Betreiber der App) und dem <strong>Kalender-Owner</strong> (Besitzer eines einzelnen Familienkalenders).
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">Rollenmodell: globaler Admin vs. Kalenderrollen</div>
          <div className="space-y-2">
            <div>
              <strong>Globaler Admin</strong> ist eine technische Rolle der gesamten Anwendung. Es gibt nur einen globalen Admin.
              Diese Person kann administrative Funktionen ausführen (z.B. Benutzer verwalten, Systemfunktionen konfigurieren).
            </div>
            <div>
              <strong>Kalenderrollen</strong> gelten immer nur innerhalb eines konkreten Kalenders:
            </div>
            <div className="space-y-1 pl-4">
              <div>
                <strong>Owner</strong>: Besitzer des Kalenders. Kann Einladungen erzeugen, Mitglieder hinzufügen/entfernen und Rollen verwalten.
              </div>
              <div>
                <strong>Editor</strong>: Kann Inhalte im Kalender bearbeiten (je nach Funktionsumfang).
              </div>
              <div>
                <strong>Viewer</strong>: Kann den Kalender ansehen, aber nicht bearbeiten.
              </div>
            </div>
            <div>
              Wichtig: <strong>Owner bedeutet nicht globaler Admin</strong>. Jeder neue Account ist Owner seines eigenen Kalenders,
              aber kein globaler Admin.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">1) Registrierung: eigener Account + eigener Kalender</div>
          <div className="space-y-2">
            <div>
              Ein neuer Nutzer registriert sich mit Benutzername, E-Mail und Passwort.
              Nach der E-Mail-Verifikation kann er sich anmelden.
            </div>
            <div>
              Beim ersten Einstieg wird automatisch ein persönlicher Kalender-Kontext hergestellt.
              Existiert noch kein Kalender, wird ein Kalender erstellt und der Nutzer wird als <strong>Owner</strong> eingetragen.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">2) Kalender teilen: Nutzer einladen</div>
          <div className="space-y-2">
            <div>
              Als <strong>Owner</strong> findest du in der Sidebar den Bereich <strong>Teilen</strong>.
              Dort kannst du Einladungslinks erzeugen und Mitglieder verwalten.
            </div>
            <div>
              Du kannst andere Personen zu deinem Kalender einladen, z.B. Partner:in, Großeltern oder Betreuung.
              Die eingeladenen Personen bekommen dann Zugriff entsprechend ihrer Rolle.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">3) Mitglieder verwalten: Freigaben entfernen</div>
          <div className="space-y-2">
            <div>
              Als <strong>Owner</strong> kannst du Mitglieder auch wieder entfernen (Freigabe entziehen).
              Entfernte Nutzer sehen deinen Kalender danach nicht mehr.
            </div>
            <div>
              Hinweis: Der Owner kann sich selbst nicht entfernen, damit der Kalender nicht ohne Besitzer wird.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">Datenschutz: Konto und Kalender löschen</div>
          <div className="space-y-2">
            <div>
              Du kannst dein Konto inklusive aller eigenen Kalender und gespeicherten Daten selbst löschen:
              Sidebar &rarr; <strong>Profil</strong> &rarr; Bereich <strong>Danger Zone</strong>.
            </div>
            <div>
              Die Löschung erfordert eine Passwortbestätigung und entfernt dein Konto sowie die zugehörigen Kalenderdaten.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-extrabold">Fehlersuche / typische Fragen</div>
          <div className="space-y-2">
            <div>
              <strong>Ich sehe einen anderen Kalender nicht:</strong> Du musst Mitglied dieses Kalenders sein oder einen gültigen Einladungslink nutzen.
            </div>
            <div>
              <strong>Ich kann niemanden einladen:</strong> Nur Owner können Einladungen erstellen und Mitglieder verwalten.
            </div>
            <div>
              <strong>Ich bin Owner, aber nicht globaler Admin:</strong> Das ist korrekt und so gewollt. Globaler Admin ist nur der Betreiber der App.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
