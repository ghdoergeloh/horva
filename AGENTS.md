# AGENTS.md

Instructions for coding agents working in this repository.

Keep this file short. It holds rules that cannot be read off the code, and nothing else — no architecture tour, no command list, no restating of what the configs already say. Repository overviews measurably do not help an agent and cost tokens on every request ([arXiv:2602.11988](https://arxiv.org/abs/2602.11988)). Anything an agent can find by reading the repo belongs in the repo, and `README.md` / `CONTRIBUTING.md` carry the prose for humans.

## Repository Rules

- Business logic lives in `packages/core/src/services/*`. Handlers and routes only wire things up.
- A new API endpoint starts in `packages/contract/src/index.ts`, then a handler in `packages/core/src/handlers/`, then one line in `apps/api/src/router.ts`.
- Dependency versions come from the `pnpm-workspace.yaml` catalogs. Write `catalog:` (or `catalog:react19`) in `package.json`, never a literal version.
- `pnpm -F <pkg> pack` runs pnpm's builtin pack command, not the package script. Use `pnpm --filter <pkg> run pack`.
- After changing the better-auth config, run `pnpm -F @horva/auth generate` to regenerate `packages/db/src/schema/auth-schema.ts`.
- Scaffold a package with `pnpm turbo gen init`, a UI component with `pnpm -F @horva/ui ui-add`.

## Styling

Use semantic tokens (`bg-primary`, `text-foreground`, `border-border`, …), never raw palette colors (`bg-gray-*`, `text-indigo-*`, …). Tokens carry dark mode behaviour, raw palettes do not. The tokens are the variables in `tooling/tailwind/theme.css`.

For wiring Tailwind into a new app, adding tokens, or missing-class and dark-mode-flash problems, follow `.claude/skills/tailwind-app-setup/SKILL.md`.

## Language on GitHub

Everything that ends up on GitHub is English: pull request titles and descriptions, issues, review comments and replies, commit messages, release notes. This holds whatever language the conversation with the agent is in.

Write plain English for readers who do not speak it as a first language: short sentences, common words, no idioms, no slang, no references that only make sense in one country, abbreviations spelled out on first use. Never translate code, identifiers, paths, log output or error messages.

## Code Comments

Same plain English. Write only comments that increase maintainability — on public methods and module exports, and on non-obvious code blocks. A comment describes the current state and purpose. It must be change-independent: do not describe what the code was before, why it was changed, or how it relates to a previous version. Keep them short.

## Before Calling a Task Done

Run `pnpm format`, then `lint`, `typecheck` and `test:unit` for every changed package (`pnpm --filter <package> <script>`), or the workspace-wide scripts when a change spans packages. Fix what they report.
