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

- Node.js (empfohlen: 20+)
- npm

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd ferienplanung
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

Das Ergebnis liegt in `client/dist/` und kann z.B. über Nginx/Apache ausgeliefert werden.
Als Referenz gibt es ein Multi-Stage Dockerfile unter `client/Dockerfile`.

### Backend

```bash
cd server
npm ci
PORT=3000 node server.js
```

Für produktiven Betrieb:

- als systemd service laufen lassen
- per Reverse Proxy (Nginx/Traefik/Caddy) nach außen exponieren

## Proxmox LXC (Ubuntu) – Hinweise

Grundsätzlich ist die Installation in einem **Ubuntu LXC** problemlos möglich. Wichtig ist nur, dass für das npm-Paket `sqlite3` die Build-Dependencies vorhanden sind.

### Voraussetzungen

- Node.js (empfohlen: 20+)
- build tools für `sqlite3`

Beispiel für Ubuntu:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

Optional (je nach Setup):

```bash
sudo apt install -y git
```

### Start (typisch auf Server)

- Backend:
  - `cd server && npm ci && npm start`
  - Läuft standardmäßig auf **Port 3000**
- Frontend (Dev):
  - `cd client && npm ci && npm run dev -- --host`
  - Läuft standardmäßig auf **Port 5173**

Für den produktiven Betrieb bietet sich an:

- Frontend via `npm run build` bauen und z.B. über Nginx ausliefern (siehe `client/Dockerfile` als Referenz).
- Backend als Service (systemd) laufen lassen und ggf. per Reverse Proxy (Nginx/Traefik) nach außen exposen.

## Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.
