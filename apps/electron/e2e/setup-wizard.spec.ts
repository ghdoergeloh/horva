import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

// Requires a build (`pnpm build` / `electron-vite build`) to have produced
// out/main/index.js first — this launches the packaged main process, not the
// dev server.
const MAIN_ENTRY = path.resolve(import.meta.dirname, "../out/main/index.js");

test("first launch (no config yet) shows the setup wizard", async () => {
  // Isolate this run from any real user profile and from other parallel
  // runs: a fresh XDG_CONFIG_HOME means no packages/core config.json exists
  // yet, and a fresh --user-data-dir means no leftover Electron session state.
  const configDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-config-"));
  const userDataDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-userdata-"));

  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, "--no-sandbox"],
    env: { ...process.env, XDG_CONFIG_HOME: configDir },
  });

  try {
    const window = await app.firstWindow();
    // Default locale is German (see apps/react/src/i18n/index.ts) when no
    // language preference has been saved yet, i.e. exactly this scenario.
    await expect(window.getByText("Willkommen bei Horva")).toBeVisible();
    await expect(
      window.getByRole("button", { name: "Loslegen" }),
    ).toBeVisible();
  } finally {
    await app.close();
    await rm(configDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});
