#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/common.sh
source "${SCRIPT_DIR}/common.sh"

require_root
ensure_prerequisites
ensure_runtime_layout
update_code
full_build
write_systemd_unit
restart_service
wait_for_healthcheck "$(current_port)"

log "Update abgeschlossen."
log "Service-Status:"
systemctl --no-pager --full status "${SERVICE_NAME}" || true
