# Architecture

What cannot be read off the package list in the README: the data model,
the main flows, and the rules that hold across packages. Keep it current
with the code; a pull request that changes one of these changes this file
too.

## Data model

The tables live in `packages/db/src/schema` (`tt-schema.ts` for time
tracking, `auth-schema.ts` for better-auth). Migrations in
`packages/db/drizzle` are generated from it (`pnpm db:generate`).

- `project` has `task`s; a `task` can carry `label`s (`task_label`).
- A `slot` is a time interval. It may point to a task; a slot without a
  task is `no_task`.
- `task_moco_mapping` links a task to a Moco task for the export.

## Flows

- **Browser:** `apps/react` calls `apps/api` under `/api` on its own
  origin (`decisions/0001-*`). The API checks the session (better-auth)
  and calls the handlers of `packages/core`.
- **Electron:** the same React app talks to the main process over a
  MessagePort (`decisions/0002-*`). The main process calls the same
  handlers with the local user of the setup wizard.
- **CLI:** `apps/cli` calls the services of `packages/core` directly
  against the database of its config file.

## Rules across packages

- Business logic lives in `packages/core`. The API, the CLI and Electron
  only wire it up (`.dependency-cruiser.cjs`).
- Every procedure of the API needs a session, except the ones in
  `PUBLIC_PROCEDURES` (`apps/api/src/router.ts`).
