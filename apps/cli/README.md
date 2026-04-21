# horva — Horva Time Tracker CLI

A command-line time tracker for managing projects, tasks, labels, and time slots.

## Prerequisites

- Node.js ^24.13.0
- pnpm ^10.28.2
- PostgreSQL (via Docker or your own instance)

## Installation

### 1. Set up the database

From the repo root, start the local PostgreSQL instance and apply the schema:

```bash
docker compose up -d
pnpm db:push
```

### 2. Build the CLI

From the repo root:

```bash
pnpm --filter @horva/cli build
```

This compiles the CLI to `apps/cli/dist/index.js`.

### 3. Install globally

**Option A — link (development, reflects rebuilds instantly):**

```bash
pnpm --filter @horva/cli link --global
```

**Option B — pack and install (self-contained tarball):**

```bash
cd apps/cli/dist
pnpm pack                        # produces horva-cli-<version>.tgz
npm install -g ./horva-cli-*.tgz  # or: pnpm add -g ./horva-cli-*.tgz
```

The tarball bundles `dist/index.js` and is independent of the monorepo after installation.

### Verify

```bash
horva --help
```

## Uninstall

**If installed via link:**

```bash
pnpm unlink --global @horva/cli
```

**If installed via tarball:**

```bash
npm uninstall -g @horva/cli  # or: pnpm remove -g @horva/cli
```

## Usage

```
horva project [options]     Manage projects
horva task [options]        Manage tasks
horva label [options]       Manage labels
horva slot [options]        Manage time slots
horva log [options]         View time logs
```

Run `horva <command> --help` for details on each command.

## Environment

The CLI reads `DATABASE_URL` from the `.env` file at the repo root. Make sure it is configured before running any commands.
