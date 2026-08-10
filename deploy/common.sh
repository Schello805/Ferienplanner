#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="ferienplaner"
SERVICE_NAME="ferienplanung-backend"
DIGEST_SERVICE_NAME="ferienplanung-digest"
DEFAULT_PORT="${PORT:-3000}"
DEFAULT_DB_PATH="${DB_PATH:-/var/lib/ferienplaner/database.sqlite}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
CLIENT_DIR="${REPO_ROOT}/client"
ENV_DIR="/etc/${APP_NAME}"
ENV_FILE="${ENV_DIR}/${APP_NAME}.env"
SYSTEMD_UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
SYSTEMD_DIGEST_SERVICE_PATH="/etc/systemd/system/${DIGEST_SERVICE_NAME}.service"
SYSTEMD_DIGEST_TIMER_PATH="/etc/systemd/system/${DIGEST_SERVICE_NAME}.timer"
BACKUP_DIR="/var/lib/${APP_NAME}/backups"

log() {
  printf '[%s] %s\n' "${APP_NAME}" "$*"
}

fail() {
  printf '[%s] ERROR: %s\n' "${APP_NAME}" "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Dieses Skript muss als root ausgefuehrt werden."
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Benoetigter Befehl fehlt: $1"
}

node_major_version() {
  local raw major
  raw="$(node --version 2>/dev/null || true)"
  raw="${raw#v}"
  major="${raw%%.*}"
  if [[ -z "${major}" || ! "${major}" =~ ^[0-9]+$ ]]; then
    fail "Konnte Node-Version nicht ermitteln (node --version: ${raw:-leer})."
  fi
  printf '%s\n' "${major}"
}

ensure_supported_node() {
  local major
  local minor
  local raw
  raw="$(node --version 2>/dev/null || true)"
  raw="${raw#v}"
  major="$(node_major_version)"
  minor="$(printf '%s' "${raw}" | cut -d '.' -f2)"
  if (( major < 20 )) || { (( major == 20 )) && (( minor < 19 )); }; then
    fail "Node.js Version zu alt: v${raw} erkannt. Bitte Node.js >= 20.19 installieren (empfohlen: aktuelle 22.x LTS)."
  fi
}

ensure_prerequisites() {
  require_command git
  require_command npm
  require_command node
  require_command systemctl
  require_command curl

  ensure_supported_node

  [[ -d "${SERVER_DIR}" ]] || fail "Server-Verzeichnis nicht gefunden: ${SERVER_DIR}"
  [[ -d "${CLIENT_DIR}" ]] || fail "Client-Verzeichnis nicht gefunden: ${CLIENT_DIR}"
}

install_backend_dependencies() {
  log "Installiere Backend-Abhaengigkeiten"
  (
    cd "${SERVER_DIR}"
    if ! npm ci --omit=dev --no-audit --no-fund; then
      log "npm ci im Backend fehlgeschlagen, weiche auf npm install aus"
      npm install --omit=dev --no-audit --no-fund
    fi
  )
}

install_client_dependencies() {
  log "Installiere Frontend-Abhaengigkeiten"
  (
    cd "${CLIENT_DIR}"
    if ! npm ci --no-audit --no-fund; then
      log "npm ci im Client fehlgeschlagen, weiche auf npm install aus"
      npm install --no-audit --no-fund
    fi
  )
}

build_client() {
  log "Baue Frontend"
  (
    cd "${CLIENT_DIR}"
    npm run build
  )
}

ensure_runtime_layout() {
  log "Bereite Runtime-Verzeichnisse vor"
  mkdir -p "${ENV_DIR}"
  mkdir -p "$(dirname "${DEFAULT_DB_PATH}")"
  mkdir -p "${BACKUP_DIR}"

  if [[ ! -f "${ENV_FILE}" ]]; then
    cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
PORT=${DEFAULT_PORT}
DB_PATH=${DEFAULT_DB_PATH}
EOF
    log "Environment-Datei angelegt: ${ENV_FILE}"
  else
    log "Environment-Datei bleibt erhalten: ${ENV_FILE}"
  fi
}

ensure_digest_token() {
  if [[ -f "${ENV_FILE}" ]] && grep -qE '^DIGEST_ADMIN_TOKEN=' "${ENV_FILE}"; then
    return 0
  fi

  log "Hinweis: DIGEST_ADMIN_TOKEN fehlt in ${ENV_FILE}. Der Digest-Timer wird eingerichtet, kann aber ohne Token nicht laufen."
  log "Bitte in ${ENV_FILE} ergänzen: DIGEST_ADMIN_TOKEN=<ADMIN_BEARER_TOKEN>"
}

log_versions() {
  local git_ref
  git_ref="$(
    cd "${REPO_ROOT}" &&
    git rev-parse --short HEAD 2>/dev/null || printf 'unbekannt'
  )"

  log "Versionen: node $(node --version), npm $(npm --version), git ${git_ref}"
}

backup_database() {
  local db_path="${1:-${DEFAULT_DB_PATH}}"
  local timestamp backup_path

  if [[ ! -f "${db_path}" ]]; then
    log "Keine bestehende Datenbank fuer Backup gefunden: ${db_path}"
    return 0
  fi

  mkdir -p "${BACKUP_DIR}"
  timestamp="$(date +%Y%m%d-%H%M%S)"
  backup_path="${BACKUP_DIR}/database-${timestamp}.sqlite"
  cp "${db_path}" "${backup_path}"
  log "Datenbank-Backup erstellt: ${backup_path}"

  find "${BACKUP_DIR}" -type f -name 'database-*.sqlite' | sort | head -n -10 | xargs -r rm -f
}

write_systemd_unit() {
  local node_bin
  node_bin="$(command -v node)"
  [[ -n "${node_bin}" ]] || fail "Node-Binary konnte nicht ermittelt werden"

  log "Schreibe systemd-Unit nach ${SYSTEMD_UNIT_PATH}"
  cat > "${SYSTEMD_UNIT_PATH}" <<EOF
[Unit]
Description=Ferienplanung Backend (Node/Express)
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
WorkingDirectory=${SERVER_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${node_bin} ${SERVER_DIR}/server.js
Restart=on-failure
RestartSec=2
KillMode=mixed
TimeoutStopSec=10
StateDirectory=ferienplaner

[Install]
WantedBy=multi-user.target
EOF
}

write_digest_systemd_units() {
  log "Schreibe Digest systemd Units (${DIGEST_SERVICE_NAME})"

  cat > "${SYSTEMD_DIGEST_SERVICE_PATH}" <<'EOF'
[Unit]
Description=Ferienplanung Digest Trigger
After=network.target

[Service]
Type=oneshot
EnvironmentFile=/etc/ferienplaner/ferienplaner.env
ExecStart=/usr/bin/curl --silent --show-error --fail -X POST \
  -H "Authorization: Bearer ${DIGEST_ADMIN_TOKEN}" \
  "http://127.0.0.1:${PORT}/api/admin/digest/run"
EOF

  cat > "${SYSTEMD_DIGEST_TIMER_PATH}" <<'EOF'
[Unit]
Description=Ferienplanung Digest (monatlich)

[Timer]
OnCalendar=monthly
Persistent=true
RandomizedDelaySec=1h

[Install]
WantedBy=timers.target
EOF
}

ensure_digest_timer() {
  ensure_digest_token
  write_digest_systemd_units
  systemctl daemon-reload

  log "Aktiviere Digest Timer ${DIGEST_SERVICE_NAME}.timer"
  systemctl enable --now "${DIGEST_SERVICE_NAME}.timer"
}

enable_and_start_service() {
  log "Aktiviere und starte ${SERVICE_NAME}"
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"
}

restart_service() {
  log "Starte ${SERVICE_NAME} neu"
  systemctl daemon-reload
  systemctl restart "${SERVICE_NAME}"
}

wait_for_healthcheck() {
  local port="${1:-${DEFAULT_PORT}}"
  local url="http://127.0.0.1:${port}/health"
  local attempt

  log "Pruefe Healthcheck unter ${url}"
  for attempt in {1..20}; do
    if curl --silent --fail "${url}" >/dev/null 2>&1; then
      log "Healthcheck erfolgreich"
      return 0
    fi
    sleep 1
  done

  systemctl --no-pager --full status "${SERVICE_NAME}" || true
  fail "Healthcheck fehlgeschlagen: ${url}"
}

current_port() {
  if [[ -f "${ENV_FILE}" ]]; then
    local value
    value="$(grep -E '^PORT=' "${ENV_FILE}" | tail -n 1 | cut -d '=' -f2- || true)"
    if [[ -n "${value}" ]]; then
      printf '%s\n' "${value}"
      return 0
    fi
  fi
  printf '%s\n' "${DEFAULT_PORT}"
}

clean_worktree() {
  log "Bereinige lokalen Arbeitsbaum"
  (
    cd "${REPO_ROOT}"

    if [[ -n "$(git status --porcelain)" ]]; then
      log "Verwerfe lokale Aenderungen und entferne unversionierte Dateien"
      git reset --hard HEAD
      git clean -fd
    else
      log "Arbeitsbaum ist bereits sauber"
    fi
  )
}

update_code() {
  log "Aktualisiere Repository"
  (
    cd "${REPO_ROOT}"
    git pull --ff-only
  )
}

full_build() {
  install_backend_dependencies
  install_client_dependencies
  build_client
}
