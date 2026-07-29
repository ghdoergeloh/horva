#!/bin/bash
#
# Egress firewall for the template dev container (sandbox hardening).
#
# Policy: the public internet stays FULLY open (npm registry, GitHub, web research,
# MCP servers, arbitrary APIs) but lateral access to the Docker host, its local
# network and cloud-metadata endpoints is BLOCKED. An AI coding agent running in
# this container can therefore not reach services on the host (databases, other
# projects' dev servers, admin UIs) or any other machine on that network.
#
# On a remote Docker host this matters twice over: "the host" is a shared server,
# and the metadata block (169.254.169.254) prevents stealing its cloud IAM
# credentials.
#
# The container's own compose bridge subnet is deliberately allowed FIRST so the
# workspace can still reach postgres:5432 and mailpit:1025 in the dev stack.
#
# Runs as root inside the FIREWALL SIDECAR (firewall.Dockerfile), which owns the
# network namespace the workspace joins via `network_mode: service:firewall`. The
# sidecar holds NET_ADMIN/NET_RAW; the workspace holds no capabilities at all, so
# these rules cannot be flushed from where the agent runs. Re-applied on every
# sidecar start, since iptables rules are not persistent.

set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'        # Stricter word splitting

# 1. Save the Docker-internal DNS (127.0.0.11) rules before flushing
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# 2. Selectively restore only the internal Docker DNS resolution
if [ -n "$DOCKER_DNS_RULES" ]; then
    echo "Restoring Docker DNS rules..."
    iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
    iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
    # One rule per line. Read in a loop rather than `xargs -L 1`: BusyBox xargs
    # (Alpine, this sidecar's base image) does not support -L.
    while IFS= read -r rule; do
        [ -n "$rule" ] || continue
        # Split the rule into iptables arguments on spaces. The script-wide IFS
        # ($'\n\t') would keep it as one argument, so restore the default here.
        # shellcheck disable=SC2086  # intentional word splitting
        (IFS=' '; iptables -t nat $rule)
    done <<EOF
$DOCKER_DNS_RULES
EOF
else
    echo "No Docker DNS rules to restore"
fi

# 3. Baseline allow: loopback, DNS, established/related
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# DNS (for name resolution; also Docker DNS on 127.0.0.11)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
iptables -A INPUT  -p udp --sport 53 -j ACCEPT

# Allow replies on already-established connections
iptables -A INPUT  -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 4. Allow the container's own compose bridge subnet FIRST so workspace <-> postgres,
#    workspace <-> mailpit and the VS Code server <-> container channel (plus Docker
#    DNS) keep working. iptables is first-match: this ACCEPT wins over the later
#    REJECT of 172.16.0.0/12 etc.
#
#    Derived from the container's own interface addresses rather than the default
#    route, so a multi-network compose setup is covered too.
#    `ip route` lists a "<subnet> dev eth0 proto kernel scope link" entry per
#    attached network — exactly the compose networks this container joined.
BRIDGE_NETS=$(ip -o -4 route show scope link | awk '$1 ~ /\// {print $1}' | sort -u)
if [ -n "${BRIDGE_NETS:-}" ]; then
    for net in $BRIDGE_NETS; do
        echo "Allowing container bridge network: $net"
        iptables -A INPUT  -s "$net" -j ACCEPT
        iptables -A OUTPUT -d "$net" -j ACCEPT
    done
else
    echo "WARNING: could not determine container networks — bridge network not allowed"
fi

# The default gateway is the Docker bridge on the host side; it must stay reachable
# for outbound NAT. Allowed as a single host, NOT as a whole subnet — so the host's
# other listening services stay blocked (they live on different addresses).
GATEWAY_IP=$(ip route | awk '/^default/ {print $3; exit}')
if [ -n "${GATEWAY_IP:-}" ]; then
    echo "Allowing default gateway: $GATEWAY_IP"
    iptables -A OUTPUT -d "$GATEWAY_IP" -j ACCEPT
fi

# 5. Block the remaining private / internal networks (no lateral access to the host
#    machine or the LAN). Order matters: REJECT the internal targets here, THEN the
#    general ACCEPT for the public internet in step 6.
BLOCKED_NETS=(
    "10.0.0.0/8"       # RFC1918 private (also Docker Desktop host ranges)
    "172.16.0.0/12"    # RFC1918 private (incl. the Docker bridge range)
    "192.168.0.0/16"   # RFC1918 private (typical home/office LAN)
    "169.254.0.0/16"   # Link-local incl. cloud metadata 169.254.169.254
    "100.64.0.0/10"    # CGNAT (e.g. Tailscale)
    "127.0.0.0/8"      # Loopback beyond the lo ACCEPT above (defence in depth)
)
for net in "${BLOCKED_NETS[@]}"; do
    echo "Blocking outbound to $net"
    iptables -A OUTPUT -d "$net" -j REJECT --reject-with icmp-admin-prohibited
done

# Docker resolves the host as host.docker.internal / gateway.docker.internal. Those
# normally land in a blocked range above, but block them by resolved address too, in
# case a Docker release places them outside RFC1918 space.
for host in host.docker.internal gateway.docker.internal host.lima.internal; do
    for ip in $(dig +short +time=2 +tries=1 A "$host" 2>/dev/null | grep -E '^[0-9.]+$' || true); do
        echo "Blocking outbound to $host ($ip)"
        iptables -A OUTPUT -d "$ip" -j REJECT --reject-with icmp-admin-prohibited
    done
done

# 6. Allow everything else (the public internet) outbound — unrestricted by design.
iptables -A OUTPUT -j ACCEPT

# 7. Inbound restrictive: default DROP (only the INPUT rules allowed above apply).
iptables -P INPUT   DROP
iptables -P FORWARD DROP
iptables -P OUTPUT  ACCEPT

echo "Firewall configuration complete"
echo "Verifying firewall rules..."

# The public internet MUST be reachable (npm registry, GitHub, web research, MCP).
if ! curl --connect-timeout 5 -sS https://registry.npmjs.org/ >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://registry.npmjs.org/"
    exit 1
fi
echo "Firewall verification passed - able to reach the public internet as expected"

# Cloud metadata / link-local MUST be blocked.
if curl --connect-timeout 3 -sS http://169.254.169.254/ >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach 169.254.169.254 (metadata)"
    exit 1
fi
echo "Firewall verification passed - unable to reach 169.254.169.254 as expected"

# The compose network MUST stay reachable (postgres/mailpit). Only DNS is asserted
# here: this sidecar starts BEFORE postgres is up, so a connect check would race.
if ! dig +short +time=2 +tries=1 A postgres >/dev/null 2>&1; then
    echo "WARNING: cannot resolve 'postgres' — is the compose network wired up?"
else
    echo "Firewall verification passed - compose service DNS resolves as expected"
fi
