# 0004: PGlite next to PostgreSQL

Status: accepted (2026-11-13)

## Context

The desktop app and the CLI needed a running PostgreSQL server, which on a
Mac usually means Docker. A single user wants the data in a local folder
instead. The web deployment keeps a real server.

## Decision

`createDatabase(url)` in `@horva/db` picks the driver by the URL:
`postgres://` opens a `pg` pool, `file:///path` opens PGlite (PostgreSQL
compiled to WebAssembly) with its data in that folder. Both use the same
schema and the same migrations. The API accepts `postgres://` only.

PGlite allows one process per folder. The process that opens it writes its
id into `<folder>.lock`; a second process gets `DatabaseLockedError`. A lock
of a process that no longer runs is taken over.

The desktop app offers a local database in its data folder
(`<userData>/data`) as the default in the setup wizard. It migrates that
folder on every start and closes it on quit. A PostgreSQL server is still
migrated with `horva migrate`: it may be shared, and older databases there
have no migration journal.

`pnpm db:copy <from> <to>` copies all rows between any two databases, e.g.
from PostgreSQL to PGlite and back (`packages/db/src/copy.ts`).

## Reason

PGlite is real PostgreSQL, so services, queries and migrations stay the
same, and the unit tests already run on it. SQLite would need a second
schema and second migrations.

## Consequences

- The desktop app and the CLI share `config.json`, so with a local folder
  the CLI gets `DatabaseLockedError` while the app runs. They cannot use
  one PGlite folder at the same
  time. Sharing it would need a socket server in the app
  (`@electric-sql/pglite-socket`).
- A PGlite version with a new PostgreSQL major version may not read an old
  folder. Before such an update, copy the data out with `pnpm db:copy`
  and back in.
- Back up a folder only while no process has it open.
- After a crash the lock file stays. It is taken over when its process id
  no longer runs. If the system has given that id to another process by
  then, the folder counts as locked; the error names the lock file to
  delete.
