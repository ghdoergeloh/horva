# syntax=docker/dockerfile:1
# Privileged firewall sidecar for the dev container.
#
# This container owns the network namespace that the workspace joins
# (`network_mode: service:firewall`). It installs the egress rules as root with
# NET_ADMIN and then idles, so the rules keep governing the workspace's traffic
# while the workspace itself stays fully unprivileged and cannot change them.
#
# Kept deliberately tiny: it holds the only NET_ADMIN capability in the stack, so
# it should contain as little attack surface as possible. No Node, no toolchain.
#
# NOTE: this image intentionally runs as root — `iptables` requires it, and that is
# the whole point of isolating the privilege here instead of in the workspace. No
# user code and no agent ever runs in this container; it applies the rules and idles.
FROM alpine:3.22

RUN apk add --no-cache \
    iptables \
    ip6tables \
    iproute2 \
    bash \
    curl \
    bind-tools

COPY init-firewall.sh /usr/local/bin/init-firewall.sh
COPY firewall-entrypoint.sh /usr/local/bin/firewall-entrypoint.sh
RUN chmod 0755 /usr/local/bin/init-firewall.sh /usr/local/bin/firewall-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/firewall-entrypoint.sh"]
