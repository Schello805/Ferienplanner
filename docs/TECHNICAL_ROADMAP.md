# Technische Roadmap

Diese Roadmap bündelt die nächsten sinnvollen Ausbauschritte für `Mein Ferienplaner` nach dem Go-Live.

## Phase 1: Stabilität absichern

### 1. E2E-Tests für Kernpfade
Ziel:
- Setup, Login, Logout und zentrale Einstiegsseiten browserseitig absichern
- künftige Auth-/Routing-Regressionen früh erkennen

Status:
- erste Playwright-Pfade für Startseite, Consent und Auth-Flow ergänzt

Nächste Schritte:
- Kind anlegen und Sidebar-Flow testen
- Einladungs- und Mail-nahe Pfade ergänzen
- E2E in CI fester verankern

### 2. Frontend-Bundle verkleinern
Ziel:
- Erstaufruf schneller machen
- App-Route vom öffentlichen Marketing-/Info-Bereich entkoppeln

Status:
- Route-Level Lazy Loading für große Seiten eingeführt

Nächste Schritte:
- schwere App-Teilbereiche innerhalb von `/app` weiter aufsplitten
- Bundle-Analyse durchführen und größte Brocken priorisieren

## Phase 2: Codebasis wartbarer machen

### 3. Backend modularisieren
Ziel:
- `server/server.js` schrittweise entschlacken
- Logik nach Verantwortlichkeiten trennen

Status:
- Admin-Logik in ein eigenes Modul ausgelagert

Nächste Schritte:
- Mail-/SMTP-Logik auslagern
- Invitations/Freigaben isolieren
- Digest-Logik in eigenes Modul verschieben

## Phase 3: Betrieb absichern

### 4. Restore- und Betriebscheck standardisieren
Ziel:
- Backups nicht nur erstellen, sondern reproduzierbar zurückspielen können
- Routine für Healthcheck, Restore und Nachkontrolle dokumentieren

Status:
- Betriebs- und Restore-Ablauf dokumentiert

Nächste Schritte:
- Restore einmal testweise auf einer Kopie durchführen
- optional kleinen Shell-Check für Restore/Nachkontrolle ergänzen

### 5. Consent/Matomo verifizieren
Ziel:
- sicherstellen, dass Matomo wirklich nur nach Einwilligung lädt
- Analytics-Setup nachvollziehbar dokumentieren

Status:
- Consent-Flow technisch eingebaut
- lokale Matomo-Datei bleibt bewusst außerhalb von Git

Nächste Schritte:
- Browserseitig prüfen: ohne Zustimmung kein Request an Matomo
- mit Zustimmung korrekte Requests und Widerruf testen

## Priorisierte Reihenfolge

1. Kernpfade per E2E absichern
2. Bundle und Routing weiter optimieren
3. Backend modular weiter zerlegen
4. Restore praktisch testen
5. Analytics-/Consent-Verifikation abschließen
