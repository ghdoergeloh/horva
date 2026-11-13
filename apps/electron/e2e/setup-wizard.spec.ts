import { existsSync } from "node:fs";
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

    // Each field is linked to its label, and the database field to its hint.
    await expect(window.getByLabel("Dein Name")).toBeFocused();
    // The local database is preselected; the server URL appears on demand.
    await expect(
      window.getByRole("radio", { name: "Auf diesem Gerät" }),
    ).toBeChecked();
    await expect(window.getByLabel("PostgreSQL-Verbindungs-URL")).toHaveCount(
      0,
    );
    await window.getByText("Auf einem PostgreSQL-Server").click();
    const databaseUrl = window.getByLabel("PostgreSQL-Verbindungs-URL");
    await expect(databaseUrl).toHaveAccessibleDescription(
      "Die Verbindungs-URL deines Servers.",
    );
  } finally {
    await app.close();
    await rm(configDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});

test("the wizard shows the message of the main process as it is", async () => {
  const configDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-config-"));
  const userDataDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-userdata-"));
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, "--no-sandbox"],
    env: { ...process.env, XDG_CONFIG_HOME: configDir },
  });

  try {
    const window = await app.firstWindow();
    await window.getByLabel("Dein Name").fill("Robin");
    await window.getByText("Auf einem PostgreSQL-Server").click();
    await window.getByLabel("PostgreSQL-Verbindungs-URL").fill("mysql://x");
    await window.getByRole("button", { name: "Loslegen" }).click();
    // Without "Error invoking remote method 'setup:complete': Error: ".
    await expect(window.getByRole("alert")).toHaveText(
      "Database URL must be a postgres:// or file:/// URL",
    );
  } finally {
    await app.close();
    await rm(configDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});

test("the local database needs no server and keeps the data", async () => {
  const configDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-config-"));
  const userDataDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-userdata-"));
  const launch = () =>
    electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, "--no-sandbox"],
      // No DATABASE_URL: the app must not depend on a running PostgreSQL.
      env: { ...process.env, XDG_CONFIG_HOME: configDir, DATABASE_URL: "" },
    });

  try {
    let app = await launch();
    let window = await app.firstWindow();
    await window.getByLabel("Dein Name").fill("Robin");
    await window.getByRole("button", { name: "Loslegen" }).click();
    await expect(window.getByText("Willkommen bei Horva")).toHaveCount(0);
    await expect(window.getByRole("alert")).toHaveCount(0);
    // The app holds the folder while it runs and frees it on quit.
    expect(existsSync(path.join(userDataDir, "data.lock"))).toBe(true);
    await app.close();
    expect(existsSync(path.join(userDataDir, "data", "PG_VERSION"))).toBe(true);
    expect(existsSync(path.join(userDataDir, "data.lock"))).toBe(false);

    // A second start opens the same folder without the wizard.
    app = await launch();
    window = await app.firstWindow();
    await expect(window.getByRole("navigation").first()).toBeVisible();
    await expect(window.getByText("Willkommen bei Horva")).toHaveCount(0);
    await app.close();
  } finally {
    await rm(configDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});
