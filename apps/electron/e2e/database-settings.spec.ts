import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "@playwright/test";
import { _electron as electron, expect, test } from "@playwright/test";

// Needs a build first, see setup-wizard.spec.ts.
const MAIN_ENTRY = path.resolve(import.meta.dirname, "../out/main/index.js");

async function openSettings(window: Page) {
  await window.getByRole("link", { name: "Einstellungen" }).first().click();
  await expect(
    window.getByRole("heading", { name: "Datenbank" }),
  ).toBeVisible();
}

test("switches to another database and back in the settings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "horva-e2e-switch-"));
  const configDir = path.join(root, "config");
  const userDataDir = path.join(root, "userdata");
  const otherFolder = path.join(root, "other");
  const launch = () =>
    electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, "--no-sandbox"],
      env: { ...process.env, XDG_CONFIG_HOME: configDir, DATABASE_URL: "" },
    });

  try {
    let app = await launch();
    let window = await app.firstWindow();
    await window.getByLabel("Dein Name").fill("Robin");
    await window.getByRole("button", { name: "Loslegen" }).click();
    await openSettings(window);

    // The app's folder is in use, so only another database is a choice.
    await expect(
      window.getByRole("radio", { name: /Auf diesem Gerät/ }),
    ).toBeDisabled();
    await window
      .getByLabel("Verbindungs-URL")
      .fill(pathToFileURL(otherFolder).href);
    await window.getByRole("button", { name: "Prüfen" }).click();
    await expect(window.getByText("Die Datenbank ist leer.")).toBeVisible();
    await expect(
      window.getByRole("checkbox", { name: "Meine Daten mitnehmen" }),
    ).toBeChecked();
    await window.getByRole("button", { name: "Wechseln" }).click();

    // The window reloads with the new database in use.
    await openSettings(window);
    await expect(window.getByText(otherFolder, { exact: true })).toBeVisible();
    expect(existsSync(path.join(otherFolder, "PG_VERSION"))).toBe(true);
    await app.close();
    expect(existsSync(`${otherFolder}.lock`)).toBe(false);

    // config.json keeps the choice for the next start.
    app = await launch();
    window = await app.firstWindow();
    await openSettings(window);
    await expect(window.getByText(otherFolder, { exact: true })).toBeVisible();

    // Back to the app's folder, which holds data: no copy.
    await window.getByText("Auf diesem Gerät").click();
    await window.getByRole("button", { name: "Prüfen" }).click();
    await expect(
      window.getByText(/Die Datenbank enthält schon Daten/),
    ).toBeVisible();
    await expect(window.getByRole("checkbox")).toHaveCount(0);
    await window.getByRole("button", { name: "Wechseln" }).click();
    await openSettings(window);
    await expect(
      window.getByText(path.join(userDataDir, "data"), { exact: true }),
    ).toBeVisible();
    await app.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shows why a database cannot be used", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "horva-e2e-switch-"));
  const app = await electron.launch({
    args: [
      MAIN_ENTRY,
      `--user-data-dir=${path.join(root, "userdata")}`,
      "--no-sandbox",
    ],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: path.join(root, "config"),
      DATABASE_URL: "",
    },
  });
  try {
    const window = await app.firstWindow();
    await window.getByLabel("Dein Name").fill("Robin");
    await window.getByRole("button", { name: "Loslegen" }).click();
    await openSettings(window);
    await window.getByLabel("Verbindungs-URL").fill("mysql://x/horva");
    await window.getByRole("button", { name: "Prüfen" }).click();
    await expect(window.getByRole("alert")).toHaveText(
      "Database URL must be a postgres:// or file:/// URL",
    );
  } finally {
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
});
