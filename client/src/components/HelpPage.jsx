import { LegalPage } from './LegalPage.jsx';

export const HelpPage = () => {
  return (
    <LegalPage title="Hilfe">
      <div className="space-y-8">
        <section className="space-y-2" aria-labelledby="hilfe-ueberblick">
          <div id="hilfe-ueberblick" className="text-base font-extrabold">
            Überblick
          </div>
          <div>
            Mein Ferienplaner ist eine Familien-Kalender-App. Wichtig ist die Unterscheidung zwischen dem <strong>globalen Admin</strong>
            (Betreiber der App) und dem <strong>Kalender-Owner</strong> (Besitzer eines einzelnen Familienkalenders).
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-inhalt">
          <div id="hilfe-inhalt" className="text-base font-extrabold">
            Inhalt
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-schnellstart">
              Schnellstart
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-rollen">
              Rollenmodell
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-registrierung">
              Registrierung & Kalender
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-teilen">
              Teilen & Einladen
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-mitglieder">
              Mitglieder verwalten
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-loeschen">
              Konto löschen
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800" href="#hilfe-faq">
              FAQ
            </a>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-schnellstart">
          <div id="hilfe-schnellstart" className="text-base font-extrabold">
            Schnellstart
          </div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Registrieren (Benutzername, E-Mail, Passwort) und E-Mail verifizieren.</li>
            <li>Anmelden: dein persönlicher Kalender wird automatisch genutzt bzw. beim ersten Mal erstellt.</li>
            <li>Sidebar &rarr; <strong>Teilen</strong>: Einladungslink erzeugen und an Familienmitglieder senden.</li>
            <li>Sidebar &rarr; <strong>Teilen</strong>: Mitglieder prüfen und bei Bedarf entfernen.</li>
          </ol>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-rollen">
          <div id="hilfe-rollen" className="text-base font-extrabold">
            Rollenmodell (wichtig!)
          </div>
          <div className="space-y-2">
            <div>
              <strong>Globaler Admin</strong> ist eine technische Rolle der gesamten Anwendung. Es gibt nur einen globalen Admin.
              Diese Person kann administrative Funktionen ausführen.
            </div>
            <div>
              <strong>Kalenderrollen</strong> gelten immer nur innerhalb eines konkreten Kalenders:
            </div>
            <div className="space-y-1">
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
              Merksatz: <strong>Owner bedeutet nicht globaler Admin</strong>. Jeder neue Account kann Owner seines eigenen Kalenders sein,
              ohne globale Admin-Rechte zu haben.
            </div>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-registrierung">
          <div id="hilfe-registrierung" className="text-base font-extrabold">
            Registrierung & eigener Kalender
          </div>
          <div className="space-y-2">
            <div>
              Ein neuer Nutzer registriert sich mit Benutzername, E-Mail und Passwort. Nach der E-Mail-Verifikation kann er sich anmelden.
            </div>
            <div>
              Beim ersten Einstieg wird automatisch ein persönlicher Kalender-Kontext hergestellt. Existiert noch kein Kalender, wird ein Kalender
              erstellt und der Nutzer wird als <strong>Owner</strong> eingetragen.
            </div>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-teilen">
          <div id="hilfe-teilen" className="text-base font-extrabold">
            Teilen & Einladen
          </div>
          <div className="space-y-2">
            <div>
              Als <strong>Owner</strong> findest du in der Sidebar den Bereich <strong>Teilen</strong>. Dort kannst du Einladungslinks erzeugen.
            </div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Sidebar öffnen.</li>
              <li>Tab <strong>Teilen</strong> auswählen.</li>
              <li>Einladungslink erstellen und an die Person senden.</li>
              <li>Die Person öffnet den Link und wird mit der definierten Rolle Mitglied deines Kalenders.</li>
            </ol>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-mitglieder">
          <div id="hilfe-mitglieder" className="text-base font-extrabold">
            Mitglieder verwalten (Freigaben entfernen)
          </div>
          <div className="space-y-2">
            <div>
              Als <strong>Owner</strong> kannst du Mitglieder auch wieder entfernen. Entfernte Nutzer sehen deinen Kalender danach nicht mehr.
            </div>
            <div>
              Hinweis: Der Owner kann sich selbst nicht entfernen, damit der Kalender nicht ohne Besitzer wird.
            </div>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-loeschen">
          <div id="hilfe-loeschen" className="text-base font-extrabold">
            Datenschutz: Konto und Kalender löschen
          </div>
          <div className="space-y-2">
            <div>
              Du kannst dein Konto inklusive aller eigenen Kalender und gespeicherten Daten selbst löschen:
              Sidebar &rarr; <strong>Profil</strong> &rarr; Bereich <strong>Danger Zone</strong>.
            </div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Tab <strong>Profil</strong> öffnen.</li>
              <li>Im Bereich <strong>Danger Zone</strong> die Hinweise lesen und bestätigen.</li>
              <li>Passwort eingeben und Löschung auslösen.</li>
            </ol>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="hilfe-faq">
          <div id="hilfe-faq" className="text-base font-extrabold">
            FAQ / typische Fragen
          </div>
          <div className="space-y-3">
            <div>
              <div className="font-bold">Ich sehe einen anderen Kalender nicht.</div>
              <div>Du musst Mitglied dieses Kalenders sein oder einen gültigen Einladungslink nutzen.</div>
            </div>
            <div>
              <div className="font-bold">Ich kann niemanden einladen.</div>
              <div>Nur Owner können Einladungen erstellen und Mitglieder verwalten.</div>
            </div>
            <div>
              <div className="font-bold">Ich bin Owner, aber nicht globaler Admin.</div>
              <div>Das ist korrekt und so gewollt. Globaler Admin ist nur der Betreiber der App.</div>
            </div>
          </div>
        </section>
      </div>
    </LegalPage>
  );
};
