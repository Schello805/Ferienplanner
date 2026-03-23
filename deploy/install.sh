#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/common.sh
source "${SCRIPT_DIR}/common.sh"

require_root
ensure_prerequisites
ensure_runtime_layout
log_versions
backup_database
full_build
write_systemd_unit
enable_and_start_service
wait_for_healthcheck "$(current_port)"

log "Installation abgeschlossen."
log "Service-Status:"
systemctl --no-pager --full status "${SERVICE_NAME}" || true
