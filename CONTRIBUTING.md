# Contributing to Horva

Thanks for your interest in contributing! Horva is an open-source, self-hosted time tracking suite — desktop, web, CLI, and API, all sharing one typed contract. Bugs, features, docs, translations, and design feedback are all welcome.

This guide covers how to set up the project, the workflow we follow, and the conventions we expect contributions to match.

---

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Workflow](#workflow)
- [Coding conventions](#coding-conventions)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Reporting bugs](#reporting-bugs)
- [Requesting features](#requesting-features)
- [Security issues](#security-issues)
- [Releases](#releases)
- [License](#license)

## Ways to contribute

- **Report a bug** — open an issue describing what you expected and what actually happened.
- **Request a feature** — open an issue outlining the use case. Smaller, focused requests are easier to discuss.
- **Fix an issue** — look at issues labeled [`good first issue`](https://github.com/ghdoergeloh/horva/labels/good%20first%20issue) or [`help wanted`](https://github.com/ghdoergeloh/horva/labels/help%20wanted).
- **Improve documentation** — fix typos, clarify steps, add examples, or extend the specs under [`docs/`](./docs).
- **Add a translation** — the Electron app uses `i18next`; adding a locale is a great first contribution.
- **Design / UX feedback** — screenshots, mockups, or written critiques are all useful.

If you're planning something non-trivial, please open an issue first so we can align on scope before you invest time.

## Development setup

### Prerequisites

- **Node.js** `^24.13.0`
- **pnpm** `^10.28.2`
- **Docker** + Docker Compose (for PostgreSQL and Mailpit)

### Getting started

```bash
git clone https://github.com/ghdoergeloh/horva.git
cd horva
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:push
pnpm dev
```

See the [README](./README.md#development-setup) for the full walkthrough, including how to run individual apps (`api`, `react`, `electron`, `cli`).

### Repo layout

```
apps/        # api, cli, electron, react
packages/    # contract, auth, core, db, ui, transactional
tooling/     # shared ESLint / Prettier / TS / Tailwind / Vitest configs
docs/        # feature specs and design docs
```

The **contract** package (`packages/contract`) is the source of truth for the API shape. When adding an endpoint:

1. Define the route in `packages/contract/src/index.ts`.
2. Implement it in `apps/api/src/router.ts`.
3. Consume it from `apps/react`, `apps/cli`, or `apps/electron` with full type inference.

## Workflow

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-change
   ```
2. **Make your changes** in small, logical commits.
3. **Run the quality checks** locally before pushing:
   ```bash
   pnpm format:fix
   pnpm lint
   pnpm typecheck
   pnpm test:unit
   pnpm build
   ```
   CI runs the same checks on every PR.
4. **Push** your branch and open a pull request against `main`.

For changes that only touch one package, you can scope the checks:

```bash
pnpm -F @horva/db lint
pnpm -F @horva/db typecheck
pnpm -F @horva/db test:unit
```

## Coding conventions

- **TypeScript strict mode everywhere.** `noUncheckedIndexedAccess` is on; `verbatimModuleSyntax` requires `import type` for type-only imports.
- **ESM only.** All packages are `"type": "module"`.
- **Imports are auto-sorted** by Prettier: types → React → third-party → `@horva/*` → local (`~/`, `../`, `./`). Don't fight the sort.
- **Tailwind classes** are sorted automatically inside `cn()` and `cva()`.
- **Path aliases:** `apps/react` uses `~/` → `src/`.
- **Dependency versions** live in `pnpm-workspace.yaml` catalogs. New deps should use `catalog:` references where appropriate.
- **No mocks at the DB boundary.** Integration tests hit real PostgreSQL via Docker Compose.
- **Comments** should explain _why_, not _what_. Most code doesn't need them.
- **UI changes** should be verified in a running dev server, not just by passing typecheck.

See [`CLAUDE.md`](./CLAUDE.md) for a deeper tour of conventions.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/), enforced via commitlint + a husky pre-commit hook.

Format:

```
<type>(<optional scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`.

Examples:

```
feat(api): add task labels endpoint
fix(electron): use local timezone in PlanButton date picker
docs: clarify database setup in README
chore(deps): bump drizzle-orm to 0.40.0
```

Keep the summary imperative and under ~72 characters. Put the _why_ in the body if it's not obvious from the diff.

## Pull requests

Before opening a PR, please:

- Rebase onto the latest `main` and resolve conflicts.
- Make sure `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm build` all pass.
- Update docs (`README.md`, `docs/`, JSDoc) if your change affects user-facing behavior or public APIs.
- Keep PRs focused. Prefer several small PRs over one giant one.

Your PR description should cover:

- **What** is changing and **why**.
- **How** it was tested (unit tests, manual steps, screenshots for UI work).
- Any **breaking changes** or follow-ups.

Reviewers may ask for changes — that's normal. Push additional commits to the same branch; avoid force-pushing once review has started unless asked.

## Reporting bugs

Open a [new issue](https://github.com/ghdoergeloh/horva/issues/new) and include:

- What you did (minimal reproduction steps).
- What you expected to happen.
- What actually happened (logs, screenshots, or a short screen recording).
- Your environment: OS, Node version, pnpm version, Horva version (desktop app) or commit SHA (dev).

Please search existing issues first — a quick duplicate check saves everyone time.

## Requesting features

Open an issue describing:

- The **problem** you're trying to solve (not just the feature you want).
- Who it affects and how often.
- Any alternatives you've considered.

Small, well-scoped requests are much more likely to get picked up.

## Security issues

**Do not file public GitHub issues for security vulnerabilities.** Instead, email the maintainer directly (see the email on [@ghdoergeloh](https://github.com/ghdoergeloh)'s GitHub profile) or use GitHub's private vulnerability reporting. We'll coordinate a fix before anything is disclosed publicly.

## Releases

- The Electron desktop app is built and attached to [GitHub Releases](https://github.com/ghdoergeloh/horva/releases) automatically when a tag matching `v*` is pushed.
- Release artifacts cover macOS (`.dmg`), Windows (`.exe` via NSIS), and Linux (`.AppImage`).
- Maintainers cut releases; contributors don't need to create tags.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
