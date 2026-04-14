import { LegalPage } from './LegalPage.jsx';

export const ImprintPage = () => {
  return (
    <LegalPage
      title="Impressum"
      description="Impressum und Kontaktangaben zu Mein Ferienplaner."
      path="/impressum"
    >
      <div className="space-y-4">
        <div>
          <div className="font-extrabold">Angaben gemäß § 5 TMG</div>
          <div className="mt-2 space-y-1">
            <div>Mein Ferienplaner</div>
            <div>Betreiber: Michael Schellenberger</div>
            <div>Adresse: Ziegeleistrasse</div>
            <div>PLZ Ort: 91572 Bechhofen</div>
            <div>Land: Deutschland</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Kontakt</div>
          <div className="mt-2 space-y-1">
            <div>E-Mail: info@schellenberger.biz</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold">Haftungsausschluss</div>
          <div className="mt-2 space-y-2">
            <div>
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
              Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </div>
          </div>
        </div>
      </div>
    </LegalPage>
  );
};
