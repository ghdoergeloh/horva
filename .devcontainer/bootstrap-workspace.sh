#!/bin/bash
#
# Populate the /workspace volume on first create.
#
# The dev container runs on a REMOTE Docker host, so /workspace is a named volume
# rather than a bind mount of the local checkout — there is no host filesystem to
# mount. The repository therefore arrives via `git clone` from the remote URL, which
# the egress firewall permits (public internet is fully open, only host/LAN are
# blocked).
#
# Idempotent: if /workspace already contains a git repo (container rebuild, volume
# reused) the clone is skipped and only a `git fetch` is done.
#
# Configuration comes from .env.container (loaded via env_file in compose.yml):
#   WORKSPACE_REPO_URL  — required, e.g. https://github.com/<org>/<repo>.git
#   WORKSPACE_REPO_REF  — optional branch/tag to check out (default: remote HEAD)

set -euo pipefail
IFS=$'\n\t'

WORKSPACE=/workspace
REPO_URL="${WORKSPACE_REPO_URL:-}"
REPO_REF="${WORKSPACE_REPO_REF:-}"

# Git refuses to operate on a repo owned by another uid. On a fresh named volume the
# owner is `node` (pre-created in the Dockerfile), but be explicit for reused volumes.
git config --global --add safe.directory "$WORKSPACE"

if [ -d "$WORKSPACE/.git" ]; then
    echo "[bootstrap] $WORKSPACE already contains a git repo — skipping clone"
    git -C "$WORKSPACE" fetch --all --prune || echo "[bootstrap] WARNING: fetch failed (offline?)"
    exit 0
fi

# A non-empty directory without .git means someone put files there manually; do not
# clobber them.
if [ -n "$(ls -A "$WORKSPACE" 2>/dev/null || true)" ]; then
    echo "[bootstrap] $WORKSPACE is non-empty but has no .git — leaving it untouched"
    exit 0
fi

if [ -z "$REPO_URL" ]; then
    cat >&2 <<'EOF'
[bootstrap] ERROR: /workspace is empty and WORKSPACE_REPO_URL is not set.

Set it in .devcontainer/.env.container, e.g.

    WORKSPACE_REPO_URL=https://github.com/<org>/<repo>.git
    WORKSPACE_REPO_REF=main

Then rebuild the container. Alternatively copy the sources in manually:

    docker cp . <container>:/workspace
EOF
    exit 1
fi

echo "[bootstrap] Cloning $REPO_URL into $WORKSPACE${REPO_REF:+ (ref: $REPO_REF)}"

# Never prompt for credentials: there is no TTY during onCreateCommand, so a private
# repo without a token in the URL must fail fast with a clear message instead of
# hanging or erroring cryptically.
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=/bin/true

if ! git clone ${REPO_REF:+--branch "$REPO_REF"} "$REPO_URL" "$WORKSPACE"; then
    cat >&2 <<EOF

[bootstrap] ERROR: clone of $REPO_URL failed.

If the repository is PRIVATE, put a token in the URL in
.devcontainer/.env.container:

    WORKSPACE_REPO_URL=https://<user>:<token>@github.com/<org>/<repo>.git

(a fine-grained PAT with read access to that repo is enough). Verify
WORKSPACE_REPO_REF=$REPO_REF exists, then rebuild the container.
EOF
    exit 1
fi

echo "[bootstrap] Clone complete: $(git -C "$WORKSPACE" rev-parse --short HEAD) on $(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD)"

# The app reads the repo-root .env; seed it from .env.example so `pnpm dev` works
# out of the box. .env.container (loaded by compose) overrides the addresses.
if [ ! -f "$WORKSPACE/.env" ] && [ -f "$WORKSPACE/.env.example" ]; then
    cp "$WORKSPACE/.env.example" "$WORKSPACE/.env"
    echo "[bootstrap] Seeded $WORKSPACE/.env from .env.example"
fi
