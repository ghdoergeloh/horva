---
name: tailwind-app-setup
description: Wire Tailwind v4 + the shared design system into a new or broken app in this monorepo. Use when adding a new app under `apps/`, when classes from `@repo/ui` aren't being picked up by the bundler, when dark mode doesn't apply, when a new design token is needed, or when something "looks like a Tailwind problem." Covers the entry CSS pattern, the `@source` directive, dark‑mode wiring, and adding tokens to `tooling/tailwind/theme.css`.
---

# Tailwind app setup

Use this skill when wiring Tailwind into a new app, or when fixing one of the recurring failure modes:

- Classes used only inside `@repo/ui` components don't appear in the bundle
- Dark mode doesn't switch, or there's a light/dark flash on boot
- The app needs a colour the existing tokens don't cover
- A new app's styles look "almost right" but off compared to the React app

## The architecture (don't fight it)

Three layers, each with one job:

| Layer              | Owns                                                 |
| ------------------ | ---------------------------------------------------- |
| `tooling/tailwind` | Design tokens (`theme.css`) — single source of truth |
| `packages/ui`      | React Aria components, styled with **tokens only**   |
| `apps/*`           | Routes / shells — also styled with **tokens only**   |

Every renderer in every app imports the same `theme.css`. Components and apps reference tokens (`bg-primary`, `text-foreground`, `border-border`), never palette colours (`bg-gray-100`, `text-indigo-600`).

If you ever feel the urge to write `bg-gray-50` in app code, the right move is one of:

1. Use the existing token that fits (most cases — see the token list below)
2. Add a new token to `theme.css` (rare)

Never reach for a palette colour. Palette colours don't track the dark variant.

## Token list

Read the current list from `tooling/tailwind/theme.css` (it's the source of truth). At time of writing it covers:

- Surfaces: `background`, `card`, `popover`, `muted`, `sidebar`
- Text on surfaces: `foreground`, `card-foreground`, `popover-foreground`, `muted-foreground`, `sidebar-foreground`
- Brand: `primary` / `primary-foreground`
- Accents: `accent`, `secondary`, `sidebar-accent` (each with `-foreground`)
- States: `destructive`, `warning`, `success` (each with `-foreground`)
- Structural: `border`, `input`, `ring`, `sidebar-border`, `sidebar-ring`
- Charts: `chart-1` … `chart-5`

Common substitutions when porting code:

| Generic Tailwind                            | Token                                                |
| ------------------------------------------- | ---------------------------------------------------- |
| `bg-gray-50` / page bg                      | `bg-background`                                      |
| `bg-white` / card                           | `bg-card`                                            |
| `bg-white` / sidebar                        | `bg-sidebar`                                         |
| `bg-indigo-50 text-indigo-700` / nav active | `bg-sidebar-accent text-sidebar-accent-foreground`   |
| `bg-indigo-600 text-white` / button         | `bg-primary text-primary-foreground`                 |
| `bg-black/30` / modal backdrop              | `bg-foreground/30` (theme‑aware)                     |
| `text-gray-500`                             | `text-muted-foreground`                              |
| `text-red-600`, `bg-red-50`                 | `text-destructive`, `bg-destructive/10`              |
| `text-amber-700`                            | `text-warning`                                       |
| `text-green-500`                            | `text-success`                                       |
| `border-gray-200`                           | `border-border` (`border-sidebar-border` in sidebar) |

For shade variants prefer opacity (`text-foreground/80`) over picking a different palette shade.

## Wiring a new app

### 1. Dependencies

In the new app's `package.json`:

```jsonc
{
  "devDependencies": {
    "@repo/tailwind-config": "workspace:*",
    "@repo/ui": "workspace:*",
    "@tailwindcss/vite": "catalog:", // Vite-based apps
    "tailwindcss": "catalog:",
  },
}
```

For non‑Vite bundlers, depend on `@tailwindcss/postcss` instead and reuse `@repo/tailwind-config/postcss-config`.

### 2. Bundler plugin

Vite (`vite.config.ts` or `electron.vite.config.ts` renderer block):

```ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss() /* … */],
});
```

For Electron specifically: only the **renderer** block runs Tailwind. Main and preload must not. Two Tailwind passes lead to silently missing utilities.

### 3. Entry CSS

Every renderer's entry CSS file (e.g. `src/index.css`, `src/renderer/src/styles/globals.css`):

```css
@import "tailwindcss";
@import "@repo/tailwind-config/theme";
@source "../<relative path>/node_modules/@repo/ui/src";
```

The `@source` directive is **mandatory** in Tailwind v4. Without it the bundler doesn't scan `@repo/ui`, and classes that appear only in shared components silently disappear from production. Adjust the relative path so it points at the symlink in the app's `node_modules`.

Reference implementations: `apps/react/src/index.css`, `apps/electron/src/renderer/src/styles/globals.css`.

### 4. Mount the theme on `<html>`

The dark variant is class‑based: `@variant dark` triggers when `<html class="dark">` is set. Apps own the toggle.

Canonical wiring (see `apps/electron/src/renderer/src/contexts/SettingsContext.tsx`):

- `localStorage` key, e.g. `"<app>-theme"`, value `"light" | "dark" | "system"`
- React effect calls `document.documentElement.classList.toggle("dark", resolved === "dark")`
- For `"system"`, also listen to `window.matchMedia("(prefers-color-scheme: dark)")`

To prevent a flash on boot, apply the resolved theme **synchronously, before `createRoot`**, in the entry file. Block, not effect:

```ts
// apps/<app>/src/.../main.tsx — runs before React mounts
(() => {
  const stored = localStorage.getItem("<app>-theme");
  const pref = stored === "light" || stored === "dark" ? stored : "system";
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.classList.toggle("dark", resolved === "dark");
})();
```

If the app has any inline boot CSS (e.g. a static spinner in `index.html` before React paints), that CSS also needs to handle both schemes — use `prefers-color-scheme` and an `html.dark` selector. Static `background: #fff` will flash.

## Adding a new token

Only when no existing token fits the role. Edit `tooling/tailwind/theme.css` in **three** places, in order:

1. `:root { --<name>: oklch(…); --<name>-foreground: oklch(…); }` — light value
2. `@variant dark { --<name>: oklch(…); --<name>-foreground: oklch(…); }` — dark value
3. `@theme inline { --color-<name>: var(--<name>); --color-<name>-foreground: var(--<name>-foreground); }` — exposes it as a Tailwind utility

Skipping step 3 means the variable exists but `bg-<name>` doesn't compile to anything. Skipping step 2 means the token is broken in dark mode.

Use OKLCH for new colours (matches the existing palette and gives perceptually uniform lightness). Pair every surface token with a matching `-foreground` so callers can write `bg-<x> text-<x>-foreground` without thinking.

## Adding shadcn components

`pnpm -F @repo/ui ui-add` (calls `pnpm dlx shadcn@latest add`). `packages/ui/components.json` already points `tailwind.css` at `../../tooling/tailwind/theme.css`, so added components use the shared token system automatically. Don't pass `--baseColor`; it's a no‑op given how `components.json` is configured.

## Failure modes & fixes

**"Tailwind class from `@repo/ui` doesn't apply"** — `@source` directive missing or path wrong in the app's entry CSS. Verify with `ls node_modules/@repo/ui` from the app's directory and adjust the relative path.

**"Dark mode doesn't switch"** — `<html>` doesn't have `class="dark"`. Either no toggle is wired up, or the toggle runs after first paint. Check `document.documentElement.classList`. If the boot block isn't there, components will style correctly _after_ the user toggles, but flash on every reload.

**"Build emits Tailwind warnings, components look unstyled"** — two Tailwind passes (e.g. Tailwind plugin enabled in both Electron main and renderer). Remove from main/preload.

**"Custom token I added doesn't work as `bg-<name>`"** — missing the `@theme inline` mapping (step 3 above).

**"Component looks fine in light mode but broken in dark mode"** — palette colour smuggled into the code (`bg-white`, `text-gray-…`). Grep for `(gray|indigo|red|amber|green|blue|sky|slate|zinc|neutral|stone)-[0-9]` in the app's source.

**"Modal backdrop looks weird in dark mode"** — `bg-black/30` was used. Replace with `bg-foreground/30` (or a dedicated token if backdrops vary).

## Lint guard (optional)

To prevent regressions, an ESLint rule via `no-restricted-syntax` can flag `className` strings that contain `(gray|indigo|red|amber|green|blue|sky|slate|zinc)-[0-9]`. Not currently enabled in this repo. If asked to add one, place it in `tooling/eslint/react.js` so it applies to all React workspaces.
