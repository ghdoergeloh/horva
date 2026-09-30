# Status

The first file to read after a break, a restart or a context compaction.
At most 50 lines (`tooling/quality` checks it). Details go into
`architecture.md`, decisions into `decisions/`, feature specs into the
numbered files in `docs/`.

## Now

- The checks of the template (network guard, fixed coverage floors,
  workspace checks, Storybook story tests, web end-to-end tests) run in
  horva.

## Next

- Move the screens of `apps/react` to `@horva/ui` components, then remove
  the exceptions in `ui-only.spec.ts` and `raw-colors.spec.ts`.
- Make the browser app usable on a phone: the sidebar keeps its width and
  the main area cuts off its content (see the `today-phone-light`
  screenshot). The width check does not see it, because nothing scrolls.
- Raise the coverage floors as tests are added.

## Open points

- Databases created with `db:push` or with an older `horva init` have no
  migration journal, so `horva migrate` would apply `0000` again and
  fail. They need a baseline of the journal before they use migrations.
- Migration `0002` has an older timestamp than `0001`. Drizzle skips a
  migration that is older than the last applied one, so a database that
  had `0001` before `0002` existed never gets `0002`.
