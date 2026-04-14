# Matomo und Consent

## Technischer Aufbau

- `client/public/matomo-loader.js` ist versioniert
- `client/public/matomo.local.js` bleibt lokal auf dem Zielsystem und ist nicht in Git
- Matomo wird nur geladen, wenn im Browser die Consent-Entscheidung `accepted` gespeichert wurde

Storage-Key:

- `ferienplaner_cookie_consent_v1`

Werte:

- `accepted`
- `rejected`

## Verifikation im Browser

Ohne Zustimmung:

1. Website in einem frischen Browserprofil öffnen
2. DevTools Netzwerk öffnen
3. prüfen, dass kein Request an `analytics.schellenberger.biz` oder `matomo.js` erfolgt
4. `localStorage.getItem('ferienplaner_cookie_consent_v1')` ist leer oder `rejected`

Mit Zustimmung:

1. im Consent-Banner `Statistik erlauben` klicken
2. prüfen, dass `matomo.local.js` und danach Matomo geladen werden
3. `localStorage.getItem('ferienplaner_cookie_consent_v1')` ist `accepted`

Widerruf:

1. `/cookies` öffnen
2. auf `Nur notwendige Cookies` umstellen
3. Seite neu laden und prüfen, dass keine neuen Matomo-Requests mehr starten
