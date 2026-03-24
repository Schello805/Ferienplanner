# Changelog

## 0.2.0

- Admin: SMTP-Konfiguration direkt in der App speichern (verschlüsselt) + Testmail
- Admin: Instanz-Kennzahlen erweitert (Sessions, Einladungen, E-Mail offen, SMTP Status)
- Admin: Diagnostics Export (JSON) für Fehleranalyse (ohne Secrets/Tokens)
- Admin: Read-only Datenbank-Ansicht (DB-Browser light)
- Registrierung: Verifikationsmails nutzen gespeicherte SMTP-Konfiguration
- Passwortregel: Mindestlänge von 10 auf 8 Zeichen reduziert
- Profil: E-Mail-Adresse ändern mit Bestätigungslink

## 0.1.0

- Open Signup (Registrierung) mit E-Mail-Verifikation (SMTP über Environment Variablen)
- Link-basierte Kalender-Einladungen mit Rollen (Owner/Editor/Viewer)
- Rollen-basierte Schreibrechte (Viewer = read-only)
- Sidebar-UX verbessert (Tablet), neuer Tab "Teilen" und neuer Bereich "Profil"
- Legende zeigt angelegte Kinder automatisch
