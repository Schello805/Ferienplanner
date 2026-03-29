# Ferienplanung App 🏖️

Eine moderne Webanwendung zur einfachen Urlaubsplanung für Familien.

## Funktionen

- 📅 **Interaktiver Kalender**: Jahresübersicht mit Markierungen für Wochenenden und Feiertage.
- 👨‍👩‍👧‍👦 **Personalisierte Planung**: 
  - Unterscheidung zwischen "Papa", "Mama" und "Beide".
  - **Neu**: "Betreuung" (z.B. Großeltern, Ferienlager) als eigene Kategorie.
- 🎨 **Anpassbare Farben**: Wähle deine eigenen Farben für alle Kategorien in den Einstellungen.
- 🚀 **Drag & Drop**: Einfaches Markieren von Zeiträumen durch Ziehen.
- 📊 **Statistiken**: Sofortige Übersicht über verbrauchte Urlaubstage (netto/brutto) und Betreuungstage.
- ⚠️ **Konflikt-Erkennung**: Warnung bei Schulferien ohne Betreuung.
- 🇩🇪 **Deutsche Feiertage & Schulferien**: Automatische Integration (aktuell für Bayern optimiert).
- 🔗 **Kalender teilen**: Einladungslinks erstellen und Rollen vergeben (Owner/Editor/Viewer).
- 👥 **Mitgliederverwaltung**: Als Owner Mitglieder anzeigen und Freigaben wieder entfernen.
- 🧹 **Self-Service Löschung**: Konto inkl. eigener Kalender und gespeicherter Daten im Profil löschen.
- 📖 **Hilfe-Seite**: In-App Anleitung unter `/hilfe` (Footer-Link).

## Rollen & Berechtigungen

- **Globaler Admin**: Technische Rolle für die gesamte Anwendung (es gibt nur einen globalen Admin).
- **Kalenderrollen** (pro Kalender):
  - **Owner**: Besitzer eines Kalenders, verwaltet Einladungen und Mitglieder.
  - **Editor**: Kann Inhalte bearbeiten (je nach Funktionsumfang).
  - **Viewer**: Kann ansehen, aber nicht bearbeiten.

Wichtig: **Owner bedeutet nicht globaler Admin**. Jeder neue Account kann Owner seines eigenen Familienkalenders sein, ohne globale Admin-Rechte zu besitzen.

## Technologie-Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Datenbank**: SQLite

## Installation & Start

### Voraussetzungen

- Node.js (empfohlen: 18+)
- npm

1. **Repository klonen**
   ```bash
   git clone https://github.com/Schello805/Ferienplanner.git
   cd Ferienplanner
   ```

2. **Backend starten**
   ```bash
   cd server
   npm install
   npm start
   ```
   Der Server läuft auf `http://localhost:3000`.

3. **Frontend starten**
   (In einem neuen Terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Die App ist unter `http://localhost:5173` erreichbar.

### Schnelltest

- Backend Healthcheck: `http://localhost:3000/health`
- Hilfe-Seite (Frontend): `http://localhost:5173/hilfe` (Dev) bzw. `http://localhost:3000/hilfe` (Production)

## Konfiguration (ENV)

### Frontend (Vite)

- **`VITE_API_URL`** (optional)
  - Default: `http://localhost:3000`
  - Beispiel: `VITE_API_URL=http://<server-ip>:3000`

### Backend (Express)

- **`PORT`** (optional)
  - Default: `3000`
- **`DB_PATH`** (optional)
  - Default: `server/data/database.sqlite`

## Production / Deployment Hinweise

### Frontend

```bash
cd client
npm ci
npm run build
```

Das Ergebnis liegt in `client/dist/`.

Im Production-Setup wird `client/dist` direkt vom Backend ausgeliefert (siehe Ubuntu LXC Abschnitt).

### Backend

```bash
cd server
npm ci
PORT=3000 node server.js
```

Für produktiven Betrieb:

- als systemd service laufen lassen
- per Reverse Proxy (Nginx/Traefik/Caddy) nach außen exponieren

## Ubuntu 24.04 LXC (Proxmox) – Production Setup (empfohlen)

Ziel: **ein Dienst auf Port 3000**, der sowohl API als auch Frontend ausliefert.
Das Frontend wird einmalig gebaut und vom Backend aus `client/dist` als Static/SPAs ausgeliefert.

Wichtig:

- Frontend Build ist auf **Node 18 kompatibel** (Vite 5).
- Die SQLite DB liegt **außerhalb** des Repos unter `/var/lib/ferienplaner/database.sqlite`, damit `git pull` Updates nicht an die DB kommen.

### Voraussetzungen

- Node.js (Node 18 oder 20+)
- build tools für `sqlite3`

Beispiel für Ubuntu:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++ git
```

### Automatisches Install (empfohlen)

1) **Repo klonen**

```bash
cd /root
git clone https://github.com/Schello805/Ferienplanner.git
cd Ferienplanner
```

2) **Install-Skript ausführen**

```bash
bash deploy/install.sh
```

Das Skript übernimmt automatisch:

- Runtime-Verzeichnisse anlegen
- Backend-Dependencies installieren
- Frontend-Dependencies installieren
- Frontend bauen
- systemd-Unit schreiben/aktualisieren
- Service aktivieren und starten
- Healthcheck prüfen

Wichtige Details:

- Die DB bleibt außerhalb des Repos unter `/var/lib/ferienplaner/database.sqlite`
- Die Laufzeit-Konfiguration liegt unter `/etc/ferienplaner/ferienplaner.env`
- Falls `npm ci` wegen eines Lockfile-Problems fehlschlägt, fällt das Skript automatisch auf `npm install` zurück

### systemd Service installieren

Die Unit liegt im Repo unter `deploy/ferienplanung-backend.service`.
Normalerweise musst du sie nicht manuell kopieren, weil `deploy/install.sh` das automatisch erledigt.

```bash
systemctl status ferienplanung-backend --no-pager
```

Danach erreichst du:

- Frontend: `http://<lxc-ip>:3000/`
- Healthcheck: `http://<lxc-ip>:3000/health`
- API: `http://<lxc-ip>:3000/api/vacations`

### Update (automatisch)

```bash
cd /root/Ferienplanner
bash deploy/update.sh
```

Das Update-Skript übernimmt automatisch:

- lokalen Arbeitsbaum auf Repo-Stand zurücksetzen (`git reset --hard`, `git clean -fd`)
- `git pull --ff-only`
- Dependency-Install für Backend und Frontend
- Frontend-Build
- systemd-Unit aktualisieren
- Service-Neustart
- Healthcheck

Wichtig:

- Das Skript verwirft lokale Änderungen im Repo bewusst automatisch
- Die Datenbank bleibt erhalten, weil sie außerhalb des Repos liegt

### Jahres-Digest (monatliche E-Mail) – systemd Timer

Der Jahres-Digest kann monatlich automatisch versendet werden.

Die Deploy-Skripte (`deploy/install.sh` und `deploy/update.sh`) richten dafür automatisch einen systemd **Service + Timer** ein und aktivieren ihn.

1) **Voraussetzung: Admin Token setzen**

In `/etc/ferienplaner/ferienplaner.env` muss ein Admin-Bearer-Token gesetzt sein:

```bash
DIGEST_ADMIN_TOKEN=<ADMIN_BEARER_TOKEN>
```

Hinweis: Der Token wird als `Authorization: Bearer ...` beim internen Call an den Digest-Endpoint verwendet.

2) **Units**

- `ferienplanung-digest.service` (ruft den Endpoint auf)
- `ferienplanung-digest.timer` (monatlicher Scheduler)

3) **Status prüfen**

```bash
systemctl status ferienplanung-digest.timer --no-pager
systemctl list-timers --all | grep ferienplanung-digest || true
```

4) **Logs ansehen**

```bash
sudo journalctl -u ferienplanung-digest.service -n 200 --no-pager
```

5) **Manueller Testlauf**

```bash
systemctl start ferienplanung-digest.service
```

Alternativ (direkt per curl, lokal auf dem Server):

```bash
curl -X POST \
  -H "Authorization: Bearer <ADMIN_BEARER_TOKEN>" \
  http://127.0.0.1:3000/api/admin/digest/run
```

### Logs / Debug

```bash
sudo journalctl -u ferienplanung-backend -f
```

### Häufige Probleme

- **`EADDRINUSE :3000`**: Ein anderer Prozess blockiert Port 3000.
  - Prüfen: `sudo ss -ltnp | grep ':3000'`
  - Prozess beenden oder Port ändern.
- **`SQLITE_CANTOPEN`**: Meist fehlende Rechte/Ordner.
  - In Production wird `DB_PATH=/var/lib/ferienplaner/database.sqlite` verwendet.
  - Prüfen: `ls -la /var/lib/ferienplaner`

### Dev-Mode (optional)

Wenn du lokal entwickelst:

- Backend: `cd server && npm install && npm start` (Port 3000)
- Frontend: `cd client && npm install && npm run dev` (Port 5173)

## Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.

<img width="1648" height="726" alt="Bildschirmfoto 2026-03-23 um 20 18 46" src="https://github.com/user-attachments/assets/4954a2da-dd1b-4059-9a6f-f7174b3c43c1" />

<img width="1644" height="729" alt="Bildschirmfoto 2026-03-23 um 20 19 02" src="https://github.com/user-attachments/assets/115a4513-3a72-4e0b-9885-14f1ace35254" />


