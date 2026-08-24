# Betrieb und Restore

## Regelmäßiger Betriebscheck

Der Installer richtet `ferienplanung-monitor.timer` ein. Er läuft täglich gegen 07:00 Uhr mit einer zufälligen Verzögerung von bis zu 15 Minuten und prüft:

- Backend-Healthcheck
- HTTP-5xx-Fehlerquote der vergangenen 24 Stunden
- freien Speicherplatz des Datenbank-Dateisystems
- letzten monatlichen Digest-Lauf
- Ablauf und Aufbewahrung technischer Daten

Bei einer neuen Warnung wird einmalig eine E-Mail versendet. Bleibt derselbe Fehler bestehen, wird nicht täglich erneut alarmiert. Nach Behebung folgt eine Entwarnung. Standardempfänger ist `info@schellenberger.biz`; über `MONITOR_ALERT_EMAIL` kann ein anderer Empfänger gesetzt werden.

Status und Protokoll prüfen:

```bash
systemctl status ferienplanung-monitor.timer --no-pager
systemctl start ferienplanung-monitor.service
journalctl -u ferienplanung-monitor.service -n 50 --no-pager
```

Optionale Grenzwerte in `/etc/ferienplaner/ferienplaner.env`:

```dotenv
MONITOR_ALERT_EMAIL=info@schellenberger.biz
MONITOR_ERROR_RATE_PERCENT=5
MONITOR_ERROR_COUNT=5
MONITOR_DISK_WARNING_PERCENT=90
MONITOR_DIGEST_MAX_AGE_DAYS=40
```

### Automatische Aufbewahrung

- abgelaufene Sessions und E-Mail-Verifikationen: beim nächsten täglichen Lauf
- unverifizierte Konten: 7 Tage
- erledigte, widerrufene oder abgelaufene Einladungen: 90 Tage
- Admin-Logs und aggregierte API-Metriken: 90 Tage
- Digest-Laufprotokolle: 180 Tage

Die Fristen können mit `UNVERIFIED_USER_RETENTION_DAYS`, `INVITATION_RETENTION_DAYS`, `ADMIN_LOG_RETENTION_DAYS`, `METRIC_RETENTION_DAYS` und `DIGEST_RUN_RETENTION_DAYS` überschrieben werden.

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
