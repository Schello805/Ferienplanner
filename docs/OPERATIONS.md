# Betrieb und Restore

## Regelmäßiger Betriebscheck

Nach jedem Deploy:

1. Healthcheck prüfen
2. Startseite laden
3. Login testen
4. Kalenderansicht laden
5. Logout/Login erneut testen
6. Impressum, Datenschutz, Cookiehinweis und Hilfe öffnen
7. Consent-Banner und Matomo-Verhalten kurz prüfen

## Restore-Check für SQLite

Vorbereitung:

1. aktuellen Service-Status notieren
2. aktuelle Datenbank sichern
3. Test-Restore nur mit Kopie oder in Wartungsfenster durchführen

Beispielablauf:

```bash
systemctl stop ferienplanung-backend
cp /var/lib/ferienplaner/database.sqlite /var/lib/ferienplaner/database.sqlite.pre-restore
cp /var/lib/ferienplaner/backups/database-YYYYMMDD-HHMMSS.sqlite /var/lib/ferienplaner/database.sqlite
systemctl start ferienplanung-backend
```

Nachkontrolle:

1. `http://127.0.0.1:3000/health` prüfen
2. App im Browser öffnen
3. Login mit echtem Konto testen
4. Kalenderdaten, Kinder und Einstellungen stichprobenartig prüfen
5. bei Erfolg dokumentieren, von welchem Backup restauriert wurde

Rollback bei Fehler:

```bash
systemctl stop ferienplanung-backend
cp /var/lib/ferienplaner/database.sqlite.pre-restore /var/lib/ferienplaner/database.sqlite
systemctl start ferienplanung-backend
```
