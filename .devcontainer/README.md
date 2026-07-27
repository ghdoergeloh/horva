# Dev container (sandboxed, remote Docker host)

A dev container for this monorepo designed to run an AI coding agent safely: the
**public internet is fully open**, while **the Docker host's filesystem and network
are unreachable**. It targets a **remote Docker host** and keeps running when VS Code
disconnects.

## What is isolated, and how

| Resource                                 | Status         | Mechanism                                                          |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------ |
| Public internet (npm, GitHub, APIs, MCP) | **allowed**    | blanket `ACCEPT` after the private ranges are rejected             |
| Local disk of the Docker host            | **no access**  | no bind mounts, no Docker socket — `/workspace` is a named volume  |
| Docker host itself / its LAN             | **blocked**    | RFC1918 + CGNAT + `host.docker.internal` rejected in `OUTPUT`      |
| Cloud metadata (`169.254.169.254`)       | **blocked**    | link-local range rejected — protects the host's IAM credentials    |
| Dev infra (`postgres`, mailpit)          | **allowed**    | the container's own compose subnet is allowed first (first-match)  |
| Root inside the workspace                | **impossible** | `user: node`, `cap_drop: ALL`, `no-new-privileges`, no sudo/setuid |

### Why a firewall sidecar

The egress rules need `NET_ADMIN` as root. Granting that to the workspace would be
self-defeating: `docker exec` bypasses entrypoints and lands as the image's user, so
the agent's container could flush its own firewall.

Instead the rules live in a minimal Alpine sidecar (`firewall.Dockerfile`) that owns
the network namespace. The workspace joins it via `network_mode: service:firewall`:
all of its traffic is governed by the rules, but it holds **no capabilities at all**
and cannot change them. The sidecar's healthcheck gates the workspace's start, so
there is never an open-egress window — including after a restart, since iptables
rules are not persistent.

```
┌─ firewall (root, NET_ADMIN) ── owns the network namespace ─┐
│   workspace (node, no caps)   ← agent runs here           │
│   mailpit                     ← localhost:1025 / :8025    │
└───────────────────────────────────────────────────────────┘
          postgres  ← separate namespace, reached as postgres:5432
```

## First-time setup

`/workspace` is a **named volume on the remote host**, not a mount of a local
checkout — so the sources are cloned in. Set the repo URL before the first start:

```bash
# .devcontainer/.env.container
WORKSPACE_REPO_URL=https://github.com/<org>/<repo>.git
WORKSPACE_REPO_REF=main
```

For a **private repo**, embed a token (a fine-grained PAT with read access suffices):

```bash
WORKSPACE_REPO_URL=https://<user>:<token>@github.com/<org>/<repo>.git
```

Then point VS Code at the remote Docker host and reopen in the container:

1. Set the Docker context, e.g. `docker context use my-remote-host`
   (or `"docker.environment": { "DOCKER_HOST": "ssh://user@host" }` in VS Code settings).
2. **Dev Containers: Reopen in Container**.

`bootstrap-workspace.sh` clones the repo, seeds `.env` from `.env.example`, and
`pnpm install --frozen-lockfile` runs. Both are idempotent — a rebuild that reuses
the volume only does a `git fetch`.

## Running Claude in the background

`shutdownAction: "none"` (devcontainer.json) plus `restart: unless-stopped`
(compose.yml) keep the **containers** up when VS Code disconnects. That is not by
itself enough for the processes inside them:

> **VS Code kills its integrated terminals when the client disconnects.** They are
> children of the container-side VS Code server, so starting `claude` in a normal
> terminal and closing VS Code ends that session — the container survives, the agent
> does not.

The fix is to run it inside **tmux**, which is owned by no client:

```bash
agent            # in a VS Code terminal: creates or reattaches the session
claude           # start Claude INSIDE tmux
```

Now close VS Code whenever you like. Claude keeps working in the container. To pick
it up again, open a terminal in the container and run `agent` — you land back in the
live session with its scrollback intact.

`Ctrl-b d` detaches on purpose without stopping anything. `agent --list` shows the
running sessions, `agent -n build` opens a second, independent one (e.g. to keep a
dev server separate from the agent).

Without VS Code at all — straight from the remote host or over SSH:

```bash
docker compose -f .devcontainer/compose.yml exec -u node workspace agent
```

For non-interactive jobs tmux is optional; `nohup` is enough:

```bash
nohup pnpm dev > /tmp/dev.log 2>&1 &
```

### What survives what

| Event                            | Container | tmux session | Claude process   |
| -------------------------------- | --------- | ------------ | ---------------- |
| Close VS Code / lose the network | ✅ up     | ✅ alive     | ✅ keeps working |
| `Ctrl-b d` (detach)              | ✅ up     | ✅ alive     | ✅ keeps working |
| Container restart / host reboot  | ✅ up     | ❌ gone      | ❌ stopped       |

Processes are not persistent across a container restart — nothing can make them so.
What does survive is Claude's state: `~/.claude` is a named volume and
`CLAUDE_CONFIG_DIR` points into it, so the OAuth login, settings and session history
are all still there. Resume the conversation with:

```bash
agent
claude --continue        # or: claude --resume <session>
```

To stop the whole stack:

```bash
docker compose -f .devcontainer/compose.yml down
```

## Ports

Nothing is published on the remote host — VS Code forwards these over its SSH
tunnel, so the dev servers are never exposed on the remote network:

| Port | Service                 |
| ---- | ----------------------- |
| 3000 | API (Hono + oRPC)       |
| 5173 | React (Vite dev server) |
| 4983 | Drizzle Studio          |
| 8025 | Mailpit inbox           |

Postgres lives in its own namespace; reach it as `postgres:5432` from inside
(`psql -h postgres -U postgres`).

## Environment

`.env.container` (committed — addresses only, no secrets) is injected by compose and
overrides the repo-root `.env` for the variables it defines: `DATABASE_URL` points at
`postgres:5432`, SMTP at `localhost:1025`, and dev servers bind `0.0.0.0` so port
forwarding works. Credentials and general config stay in the root `.env`.

## Files

| File                     | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `devcontainer.json`      | VS Code wiring, lifecycle commands, forwarded ports              |
| `compose.yml`            | workspace + firewall sidecar + postgres + mailpit, hardening     |
| `Dockerfile`             | workspace image: Node 24, pnpm 11, Claude Code — unprivileged    |
| `firewall.Dockerfile`    | minimal Alpine sidecar holding the only `NET_ADMIN` in the stack |
| `firewall-entrypoint.sh` | applies the rules, signals readiness, holds the namespace open   |
| `init-firewall.sh`       | the egress rules + self-verification (fails closed)              |
| `bootstrap-workspace.sh` | clones the repo into the empty volume on first create            |
| `agent-session.sh`       | the `agent` command: tmux session that survives disconnects      |
| `tmux.conf`              | tmux defaults (100k scrollback, mouse, 24-bit colour)            |
| `.env.container`         | infra addresses + clone settings                                 |

## Verifying the sandbox

The firewall self-checks on every start and **exits non-zero** if the internet is
unreachable or metadata is reachable — a misconfigured firewall fails the container
rather than silently running open. Check by hand with:

```bash
docker compose -f .devcontainer/compose.yml exec workspace sh -c '
  curl -sS -o /dev/null -w "internet: %{http_code}\n" https://registry.npmjs.org/
  curl -s --connect-timeout 3 http://169.254.169.254/ && echo "METADATA REACHABLE" || echo "metadata blocked"
  grep CapBnd /proc/self/status   # expect 0000000000000000
  id                              # expect uid=1000(node)
'
```

## Relation to the root `compose.yml`

The repo-root `compose.yml` is untouched and still serves plain local development
(`docker compose up -d` + `pnpm dev` on your machine). This stack is separate, uses
its own project name (`template-dev`) and its own volumes, so the two never collide.
