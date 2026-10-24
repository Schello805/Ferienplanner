#!/usr/bin/env bash
set -Eeuo pipefail

# This test owns the system paths below and must only run on a disposable CI VM.
[[ "${CI:-}" == true && "${EUID}" -eq 0 && "$(uname -s)" == Linux ]] || {
  echo 'Requires root on a disposable Linux CI runner.' >&2
  exit 1
}
[[ ! -e /etc/ferienplaner && ! -e /var/lib/ferienplaner && ! -e /opt/ferienplaner ]] || {
  echo 'Refusing to overwrite an existing installation.' >&2
  exit 1
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

trap 'result=$?; if (( result != 0 )); then journalctl -u ferienplanung-backend -u ferienplanung-monitor -u ferienplanung-digest --no-pager -n 100; fi; systemctl stop ferienplanung-backend.service || true; exit "$result"' EXIT

# Model the real checkout location without exposing /root to the service account.
source_repo="${REPO_ROOT}"
REPO_ROOT="$(mktemp -d /root/ferienplaner-ci-XXXXXX)"
mkdir -p "${REPO_ROOT}/client"
cp -a "${source_repo}/server" "${source_repo}/.git" "${REPO_ROOT}/"
cp -a "${source_repo}/client/dist" "${source_repo}/client/package.json" "${REPO_ROOT}/client/"
chown -R root:root "${REPO_ROOT}"
SERVER_DIR="${REPO_ROOT}/server"
CLIENT_DIR="${REPO_ROOT}/client"

ensure_prerequisites
ensure_runtime_layout
cat >> "${ENV_FILE}" <<'ENV'
PUBLIC_BASE_URL=https://ci.example.invalid
HOST=127.0.0.1
TRUST_PROXY=loopback
DIGEST_ADMIN_TOKEN=ci-only-disposable-digest-token
ENV

write_systemd_unit
write_monitor_systemd_units
write_digest_systemd_units
systemd-analyze verify "${SYSTEMD_UNIT_PATH}" "${SYSTEMD_MONITOR_SERVICE_PATH}" "${SYSTEMD_DIGEST_SERVICE_PATH}"
enable_and_start_service
wait_for_healthcheck 3000

[[ "$(systemctl show -p User --value ferienplanung-backend)" == ferienplaner ]]
pid="$(systemctl show -p MainPID --value ferienplanung-backend)"
[[ "$(stat -c %U "/proc/${pid}")" == ferienplaner ]]
grep -qE '^NoNewPrivs:[[:space:]]+1$' "/proc/${pid}/status"
runuser -u ferienplaner -- test ! -r "${REPO_ROOT}/server/server.js"
runuser -u ferienplaner -- test -r /opt/ferienplaner/server/server.js
runuser -u ferienplaner -- test ! -w /opt/ferienplaner/server/server.js
runuser -u ferienplaner -- test -w /var/lib/ferienplaner/database.sqlite
runuser -u ferienplaner -- test ! -r "${ENV_FILE}"
[[ "$(stat -c %a "${ENV_FILE}")" == 600 ]]
[[ "$(stat -c %a /var/lib/ferienplaner/database.sqlite)" == 600 ]]

node "${SCRIPT_DIR}/test-systemd.mjs" initial

# Re-run the same runtime staging used by update.sh and preserve the real database.
backup_database
runuser -u ferienplaner -- test ! -r "${BACKUP_DIR}"
write_systemd_unit
restart_service
wait_for_healthcheck 3000
node "${SCRIPT_DIR}/test-systemd.mjs" restarted

systemctl start ferienplanung-digest.service
systemctl start ferienplanung-monitor.service
[[ "$(systemctl show -p Result --value ferienplanung-digest.service)" == success ]]
[[ "$(systemctl show -p Result --value ferienplanung-monitor.service)" == success ]]
node "${SCRIPT_DIR}/test-systemd.mjs" maintenance
echo 'systemd deployment, permissions, restart, login, digest and monitoring passed.'
