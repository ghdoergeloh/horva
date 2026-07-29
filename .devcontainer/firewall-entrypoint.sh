#!/bin/bash
#
# Entrypoint of the firewall sidecar.
#
# Applies the egress rules to the network namespace this container owns (and which
# the workspace joins via `network_mode: service:firewall`), signals readiness for
# the compose healthcheck, then idles so the namespace — and therefore the rules —
# stay alive for as long as the workspace runs.

set -euo pipefail
IFS=$'\n\t'

READY_FILE=/run/firewall-ready
rm -f "$READY_FILE"

/usr/local/bin/init-firewall.sh

# The healthcheck (see compose.yml) gates the workspace's start on this file, so the
# workspace never runs during an open-egress window.
touch "$READY_FILE"
echo "[firewall] rules applied — holding the network namespace open"

# Idle forever. `exec` keeps this as PID 1 so a `docker stop` signal is delivered
# directly and the container shuts down promptly.
exec sleep infinity
