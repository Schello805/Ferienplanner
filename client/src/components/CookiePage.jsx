import { LegalPage } from './LegalPage.jsx';

export const CookiePage = () => {
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
              Diese Webapp verwendet nach aktuellem Stand keine Marketing- oder Tracking-Cookies.
              Für die Anmeldung werden technisch notwendige Session-Cookies verwendet.
            </div>
            <div>
              Je nach Server-/Proxy-Konfiguration können technisch notwendige Cookies oder Header zum sicheren Betrieb eingesetzt werden.
              Wenn zukünftig Analytics oder externe Dienste aktiviert werden, muss dieser Hinweis angepasst werden.
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
