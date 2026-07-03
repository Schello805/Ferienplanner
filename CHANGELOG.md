# Changelog

## 1.2.0

- Landingpage als inhaltlicher OnePager für berufstätige Eltern ausgebaut, mobil verbessert und SEO deutlich erweitert
- Öffentlichen Feedback-Dialog in App und Landingpage ergänzt, mobil optimiert und mit E-Mail-Versand verknüpft
- Feedback-Versand robuster gemacht: Reply-To-Fallback, alternativer Empfänger und bessere Protokollierung im Admin-Log
- Build- und Revisionsanzeige im Footer verbessert, Backend- und Frontend-Versionen synchronisiert und falschen Update-Hinweis behoben
- Matomo-Loader abgesichert, damit fehlende lokale Tracking-Dateien keine Browserfehler mehr auslösen
- Admin-Log dauerhaft für 90 Tage gespeichert und Admin-Benachrichtigungen für neue Kalender ergänzt
- Einladungen verbessert: Empfängeradresse sichtbar, Owner erhält CC bei E-Mail-Einladungen
- Registrierung und Verifikation verbessert: direkte Verifikationslinks sowie sauberer Re-Register-Prozess für unverifizierte Konten
- CI aktualisiert: GitHub Actions auf aktuelle Versionen angehoben und Test-Expectations bereinigt

## 0.2.0

- Admin: SMTP-Konfiguration direkt in der App speichern (verschlüsselt) + Testmail
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
