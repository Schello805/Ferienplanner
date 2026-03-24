import { LegalPage } from './LegalPage.jsx';

export const CookiePage = () => {
  return (
    <LegalPage title="Cookiehinweis">
      <div className="space-y-4">
        <div>
          <div className="font-extrabold">Cookies</div>
          <div className="mt-2 space-y-2">
            <div>
              Diese Webapp verwendet nach aktuellem Stand keine Marketing- oder Tracking-Cookies.
              Für die Anmeldung wird ein Token im lokalen Speicher des Browsers (LocalStorage) abgelegt.
            </div>
            <div>
              Je nach Server-/Proxy-Konfiguration können technisch notwendige Cookies oder Header zum sicheren Betrieb eingesetzt werden.
              Wenn du Analytics oder externe Dienste aktivierst, muss dieser Hinweis angepasst werden.
            </div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">LocalStorage</div>
          <div className="mt-2 space-y-2">
            <div>
              Im Browser können Einstellungen (z.B. Farben, Bundesland) und ein Login-Token gespeichert werden, damit die App funktioniert.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
