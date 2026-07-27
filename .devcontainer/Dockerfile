# syntax=docker/dockerfile:1
# Workspace image for the monorepo template dev container.
# Node.js 24 (matches package.json engines) + pnpm 11 via corepack + Claude Code CLI.
#
# Runs on a REMOTE Docker host: /workspace is a named volume (not a host bind
# mount), populated by a `git clone` on first create. See compose.yml.
#
# This container is FULLY UNPRIVILEGED — no sudo, no setuid binaries, no
# capabilities. The egress firewall lives in a separate sidecar whose network
# namespace this container joins (see firewall.Dockerfile + compose.yml), so the
# rules govern all traffic here but cannot be tampered with from inside.
#
# BuildKit is required for the --mount=type=cache build mounts below (default in
# modern Docker / Compose v2). The caches live outside the image, so layers stay
# small while apt / npm downloads are reused across rebuilds.
FROM node:24-trixie

# The official node image already ships an unprivileged `node` user (uid/gid 1000),
# which lines up with the typical first host user for clean volume ownership.
ARG USERNAME=node

# Development ergonomics. git/curl/ca-certificates already ship in the base image;
# jq is used by the Claude Code hooks, postgresql-client for psql against postgres:5432.
#
# tmux is essential here, not a nicety: VS Code runs integrated terminals as children
# of its container-side server and kills them when the client disconnects. Anything
# interactive that should outlive a disconnect — an agent session above all — has to
# run inside a tmux session, which is owned by no client. See README.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        tmux \
        jq \
        less \
        procps \
        postgresql-client

# Workspace bootstrap: clones the repo into the (initially empty) /workspace volume.
# The build context is .devcontainer/ — the repository is NOT part of the image, it
# arrives via git clone at runtime, so no sources need to exist on the remote host.
COPY bootstrap-workspace.sh /usr/local/bin/bootstrap-workspace.sh

# `agent` attaches to (or creates) the long-lived tmux session that survives VS Code
# disconnects. Shipped in the image rather than the repo so it works before the clone.
COPY agent-session.sh /usr/local/bin/agent-session.sh
COPY tmux-shell.sh /usr/local/bin/tmux-shell.sh
COPY tmux.conf /etc/tmux.conf

# Final root layer: permissions, the volume mount points, and the setuid strip.
#
# Pre-creating the directories that get named volumes mounted onto them, owned by the
# dev user, is what makes those volumes writable without a runtime chown — Docker
# seeds a fresh named volume from the image path and inherits its ownership, and there
# is no root in this container to fix it up later. /workspace is such a volume too
# (remote host, no bind mount), so this is also what lets the git clone run as `node`.
#
# The setuid/setgid strip runs LAST so it covers every file added above. This
# container needs no privilege-escalation path, so the ones the base image ships
# (su, mount, passwd, ...) are defanged. Together with `no-new-privileges` and
# `cap_drop: ALL` in compose.yml nothing inside can become root — including via
# `docker exec`, which is pinned to `user: node`.
RUN chmod 0755 /usr/local/bin/bootstrap-workspace.sh \
                /usr/local/bin/agent-session.sh \
                /usr/local/bin/tmux-shell.sh \
    && ln -s /usr/local/bin/agent-session.sh /usr/local/bin/agent \
    && mkdir -p /home/${USERNAME}/.claude \
                /home/${USERNAME}/.local/bin \
                /home/${USERNAME}/.local/share/pnpm \
                /home/${USERNAME}/.cache \
                /workspace \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME} /workspace \
    && find / -xdev -perm /6000 -type f -exec chmod a-s {} + || true

USER ${USERNAME}

# pnpm via corepack, pinned to the version from package.json (packageManager).
# COREPACK_ENABLE_DOWNLOAD_PROMPT=0 keeps the non-interactive postCreateCommand from
# blocking on corepack's download prompt; `corepack prepare` bakes pnpm into the
# image so no runtime fetch is needed.
ARG PNPM_VERSION=11.16.0
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_HOME=/home/${USERNAME}/.local/share/pnpm \
    PATH="/home/node/.local/bin:/home/node/.local/share/pnpm:${PATH}"
RUN corepack enable --install-directory /home/${USERNAME}/.local/bin \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

# Claude Code via the native installer, as the dev user: it lands in
# ~/.local/share/claude with a ~/.local/bin/claude symlink, so `claude update` works
# without root — which matters here, since this container has no root at all.
#
# CLAUDE_CONFIG_DIR moves ~/.claude.json (OAuth session, MCP servers, per-project
# trust) into the ~/.claude volume. Otherwise it sits in the container layer and
# every rebuild forces a fresh login, even though tokens survive in the volume.
ENV CLAUDE_CONFIG_DIR="/home/${USERNAME}/.claude"
RUN curl -fsSL https://claude.ai/install.sh | bash

# VS Code terminals auto-attach to tmux via the default profile, so a shell that is
# interactive yet OUTSIDE tmux means the plain-bash profile, `docker exec`, or an SSH
# login. Warn there, because work started in such a shell dies on disconnect — the
# exact silent failure the tmux setup exists to prevent.
RUN printf '%s\n' \
    'if [ -z "$TMUX" ] && [ -t 1 ]; then' \
    '  printf "\033[2mNot in tmux — work started here stops when this shell closes. Run \033[0m\033[1magent\033[0m\033[2m to use the persistent session.\033[0m\n"' \
    'fi' \
    >> /home/${USERNAME}/.bashrc

WORKDIR /workspace
