# Changelog

## 1.3.0 – 19.09.2026

- Einmaligen, mobil optimierten „Was ist neu?“-Hinweis für neue Releases ergänzt
- Mobile Monatsnavigation über Jahresgrenzen hinweg korrigiert
- Gesetzliche Feiertage pro Elternteil und Kind konfigurierbar gemacht; standardmäßig gelten sie für alle als freie Tage
- Urlaubstage berücksichtigen die persönliche Feiertagseinstellung, während Feiertage weiterhin keine Betreuungslücke auslösen
- Tageszahlen zusätzlich oben links in jeder Kalenderzelle eingeblendet
- Mobile „Mehr“-Navigation in der Seitenleiste und unteren Navigationsleiste repariert
- Serverseitigen Zugriffsschutz aller Admin-Einstellungen mit Regressionstest abgesichert
- Hoverinformationen für reine Feiertage ohne zusätzliche Einträge ausgeblendet
- Warnungs-Kachel klickbar gemacht und unbetreute Tage in einer kompakten Liste dargestellt

## 1.2.0

- Tägliche Betriebsüberwachung mit Healthcheck, API-Fehlerquote, Speicherplatz- und Digest-Prüfung sowie E-Mail-Alarm und Entwarnung ergänzt
- Datenschutzfreundliche automatische Bereinigung für abgelaufene Sessions, Verifikationen, Einladungen und technische Laufdaten ergänzt
- Monitoring-Status im Adminbereich sichtbar gemacht und Aufbewahrungsfristen dokumentiert
- Sichtbare Datums- und Uhrzeitangaben in Wizard, Fehlerbericht, Digest- und Adminstatus auf deutsches Format vereinheitlicht
- Landingpage als inhaltlicher OnePager für berufstätige Eltern ausgebaut, mobil verbessert und SEO deutlich erweitert
- Öffentlichen Feedback-Dialog in App und Landingpage ergänzt, mobil optimiert und mit E-Mail-Versand verknüpft
- Feedback-Versand robuster gemacht: Reply-To-Fallback, alternativer Empfänger und bessere Protokollierung im Admin-Log
- Build- und Revisionsanzeige im Footer verbessert, Backend- und Frontend-Versionen synchronisiert und falschen Update-Hinweis behoben
- Matomo-Loader abgesichert, damit fehlende lokale Tracking-Dateien keine Browserfehler mehr auslösen
- Admin-Log dauerhaft für 90 Tage gespeichert und Admin-Benachrichtigungen für neue Kalender ergänzt
- Einladungen verbessert: Empfängeradresse sichtbar, Owner erhält CC bei E-Mail-Einladungen
- Registrierung und Verifikation verbessert: direkte Verifikationslinks sowie sauberer Re-Register-Prozess für unverifizierte Konten
- CI aktualisiert: GitHub Actions auf aktuelle Versionen angehoben und Test-Expectations bereinigt

## 1.1.0

- Einladungslinks führen zuverlässig in den App-/Login-Flow statt auf die öffentliche Startseite
- Alte `/?invite=...`-Links bleiben nutzbar und werden automatisch korrekt weitergereicht
- Empfängeradresse bei E-Mail-Einladungen in der Einladungsliste ergänzt
- Mobile Login- und Registrierungsfelder für iPhones optimiert, damit Safari die Ansicht nicht unerwartet vergrößert
- E-Mail-Bestätigungslink robuster gemacht und erneute Registrierungen unverifizierter Konten verbessert
- Automatische Bereinigung unverifizierter Konten nach sieben Tagen ergänzt
- Erkennung neuer Deployments mit Hinweis `Update verfügbar` im Footer ergänzt
- Produktionsstart ohne gültige `PUBLIC_BASE_URL` verhindert

## 1.0.1

- Domain- und SEO-Konfiguration im Frontend zentralisiert, einschließlich generierter `index.html`, `robots.txt` und `sitemap.xml`
- Landingpage als OnePager für berufstätige Eltern mit Fokus auf kostenlose Ferienbetreuungsplanung ausgebaut
- Admin-Log um Suche, Ereignisfilter und Meta-Ansicht erweitert
- Kalender-Layering verbessert, damit Tooltips und Overlays zuverlässig über der Oberfläche liegen
- Öffentliche Texte konsequent auf die Ich-Form umgestellt

## 0.2.0

- Admin: SMTP-Konfiguration direkt in der App speichern (verschlüsselt) + Testmail
- Admin: Instanz-Kennzahlen um Sessions, Einladungen, offene E-Mails und SMTP-Status erweitert
- Admin: Diagnoseexport als JSON ohne Secrets oder Tokens ergänzt
- Admin: Schreibgeschützte Datenbankansicht ergänzt
- Registrierung: Verifikationsmails nutzen gespeicherte SMTP-Konfiguration
- Passwortregel: Mindestlänge von 10 auf 8 Zeichen reduziert
- Profil: E-Mail-Adresse ändern mit Bestätigungslink
- Profil: Konto inkl. Kalender und gespeicherter Daten im Profil löschen (Self-Service)
- Admin: Neue Benutzer können nicht mehr als Admin angelegt werden (nur Bootstrap-Admin)
- Kalender: Mitgliederliste im Teilen-Tab + Freigaben entfernen (Owner)
- Setup: Hinweis im Einrichtungs-Wizard ergänzt (ohne Kalender-Name wird automatisch ein zufälliger Link erstellt)

## 0.1.0

- Open Signup (Registrierung) mit E-Mail-Verifikation (SMTP über Environment Variablen)
- Link-basierte Kalender-Einladungen mit Rollen (Owner/Editor/Viewer)
- Rollen-basierte Schreibrechte (Viewer = read-only)
- Sidebar-UX verbessert (Tablet), neuer Tab "Teilen" und neuer Bereich "Profil"
- Legende zeigt angelegte Kinder automatisch
