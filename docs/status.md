# Status

The first file to read after a break, a restart or a context compaction.
At most 50 lines (`tooling/quality` checks it). Details go into
`architecture.md`, decisions into `decisions/`, feature specs into the
numbered files in `docs/`.

## Now

- The design system of `docs/design/` is in place: tokens, logo and
  icons, the components of `@horva/ui` and all screens (#77). Project
  colors are stored as token names (`project-1` … `project-18`) or hex.

## Next

- Move the shell, sidebar, sheet, disclosure with action and text area
  into `@horva/ui` (#92), then empty `ui-only.spec.ts`.
- Bugs found on the way: day boundaries in the server time zone (#84),
  slot neighbour rule (#93), Moco settings in the web API (#95).
- Raise the coverage floors as tests are added.

## Open points

- Databases created with `db:push` or with an older `horva init` have no
  migration journal, so `horva migrate` would apply `0000` again and
  fail. They need a baseline of the journal before they use migrations.
- Migration `0002` has an older timestamp than `0001`. Drizzle skips a
  migration that is older than the last applied one, so a database that
  had `0001` before `0002` existed never gets `0002`.
