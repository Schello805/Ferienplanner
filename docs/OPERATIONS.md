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

# Sicherheitsupdate und Proxy-Konfiguration

Das Update legt eine Laufzeitkopie unter `/opt/ferienplaner` an. Backend und
Monitoring laufen als Systembenutzer `ferienplaner`, mit Schreibzugriff nur auf
das Datenverzeichnis. Das Git-Repository kann weiterhin unter `/root/Ferienplanner`
liegen. Die Datenbank muss ausserhalb von `/root` und `/home` liegen; empfohlen
ist `/var/lib/ferienplaner/database.sqlite`. Environment-Datei und Backups werden
gegen Zugriffe anderer Benutzer abgesichert. Bestehende Sitzungen werden beim
ersten Start automatisch auf gehashte Tokens migriert.

SQLite 6 benoetigt fuer den nativen Build auf Debian die Pakete `python3`, `make`
und `g++` (`apt-get install -y python3 make g++`). Das Update prueft die Werkzeuge
vor dem Build. Node muss systemweit installiert sein, beispielsweise in `/usr/bin`.

In Produktion lauscht das Backend standardmaessig auf `127.0.0.1`. Laeuft der
Reverse Proxy in einem anderen Container, vor dem Update in
`/etc/ferienplaner/ferienplaner.env` `HOST=0.0.0.0` sowie
`TRUST_PROXY=<IP-Adresse-des-Proxys>` setzen. Port 3000 darf dann per Firewall nur
vom Proxy erreichbar sein. Der Proxy muss eingehende Forwarded-Header ersetzen
oder die echte Client-IP korrekt anhaengen. Standardmaessig werden ausschliesslich
Loopback-Proxies vertraut. Keine pauschale Freigabe aller Proxies setzen.

Die Content-Security-Policy erlaubt lokale Ressourcen und das bestehende Matomo
unter `https://analytics.schellenberger.biz`. Zusaetzliche externe Skripte muessen
vor ihrer Einbindung explizit in der Policy freigegeben werden.

Nach dem Update `systemctl status ferienplanung-backend` und
`systemctl status ferienplanung-monitor.timer` kontrollieren. Die systemd-Isolation
kann auf macOS nicht ausgefuehrt werden. GitHub Actions prueft sie auf einer
wegwerfbaren Linux-VM mit echtem systemd automatisch: Runtime-Kopie aus `/root`,
Dienstbenutzer, Dateirechte, Login, Datenpersistenz nach erneutem Deployment,
Digest und Monitoring. Der Test `deploy/test-systemd.sh` verweigert den Start
ausserhalb von CI und bei einer vorhandenen Installation. Fuer einen Rollback
auf Code vor der Token-Migration muessen
Benutzer sich erneut anmelden.
