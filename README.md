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

### Install / Build

1) **Repo klonen**

```bash
cd /root
git clone https://github.com/Schello805/Ferienplanner.git
cd Ferienplanner
```

2) **Backend Dependencies**

```bash
cd server
npm ci --omit=dev
```

3) **Frontend bauen**

```bash
cd ../client
npm ci
npm run build
```

### systemd Service installieren

Die Unit liegt im Repo unter `deploy/ferienplanung-backend.service`.

```bash
sudo cp /root/Ferienplanner/deploy/ferienplanung-backend.service /etc/systemd/system/ferienplanung-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now ferienplanung-backend
sudo systemctl status ferienplanung-backend --no-pager
```

Danach erreichst du:

- Frontend: `http://<lxc-ip>:3000/`
- Healthcheck: `http://<lxc-ip>:3000/health`
- API: `http://<lxc-ip>:3000/api/vacations`

### Update (einfach)

```bash
cd /root/Ferienplanner
git pull

cd server
npm ci --omit=dev

cd ../client
npm ci
npm run build

sudo systemctl restart ferienplanung-backend
sudo systemctl status ferienplanung-backend --no-pager
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
