import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { Page } from "@playwright/test";
import type { ChildProcess } from "node:child_process";
import { expect, test } from "@playwright/test";

/**
 * The built webview in Chromium with the built backend sidecar. The Rust
 * shell is replaced by a stub of `window.__TAURI_INTERNALS__` that passes
 * lines between the page and the sidecar, as src-tauri/src/lib.rs does.
 * Requires `pnpm build` first (turbo runs it before `test:e2e`).
 */
const BACKEND = path.resolve(import.meta.dirname, "../dist/backend/index.mjs");

/** Installs the stub of the Tauri IPC; runs in the page. */
function installTauriStub() {
  const callbacks = new Map<number, (message: unknown) => void>();
  let nextId = 1;
  let index = 0;
  const w = globalThis as unknown as Record<string, unknown>;
  w["__TAURI_INTERNALS__"] = {
    transformCallback: (callback: (message: unknown) => void) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    unregisterCallback: (id: number) => callbacks.delete(id),
    invoke: (cmd: string, args: Record<string, unknown>) => {
      if (cmd === "backend_connect") {
        const channel = args["onMessage"] as { id: number };
        w["__fromBackend"] = (line: string) =>
          callbacks.get(channel.id)?.({ index: index++, message: line });
        return Promise.resolve();
      }
      if (cmd === "backend_send") {
        return (w["__toBackend"] as (line: string) => Promise<void>)(
          args["line"] as string,
        );
      }
      return Promise.reject(new Error(`unknown command ${cmd}`));
    },
  };
}

async function startApp(page: Page, configDir: string): Promise<ChildProcess> {
  const backend = spawn(process.execPath, [BACKEND], {
    env: { ...process.env, XDG_CONFIG_HOME: configDir },
    stdio: ["pipe", "pipe", "inherit"],
  });
  await page.exposeFunction("__toBackend", (line: string) => {
    backend.stdin.write(`${line}\n`);
  });
  let toPage = Promise.resolve();
  createInterface({ input: backend.stdout }).on("line", (line) => {
    toPage = toPage.then(() =>
      page.evaluate((l) => {
        const w = globalThis as unknown as Record<string, (l: string) => void>;
        w["__fromBackend"]?.(l);
      }, line),
    );
  });
  await page.addInitScript(installTauriStub);
  await page.goto("/");
  return backend;
}

let configDir: string;
let backend: ChildProcess | undefined;

test.beforeEach(async () => {
  // A fresh XDG_CONFIG_HOME: no config.json of packages/core exists yet.
  configDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-config-"));
});

test.afterEach(async () => {
  backend?.kill();
  await rm(configDir, { recursive: true, force: true });
});

test("first launch (no config yet) shows the setup wizard", async ({
  page,
}) => {
  backend = await startApp(page, configDir);
  // Default locale is German (see apps/react/src/i18n/index.ts) when no
  // language preference has been saved yet, i.e. exactly this scenario.
  await expect(page.getByText("Willkommen bei Horva")).toBeVisible();
  await expect(page.getByRole("button", { name: "Loslegen" })).toBeVisible();

  // Each field is linked to its label, and the database field to its hint.
  await expect(page.getByLabel("Dein Name")).toBeFocused();
  const databaseUrl = page.getByLabel("PostgreSQL-Verbindungs-URL");
  await expect(databaseUrl).toHaveAccessibleDescription(
    "Wo deine Daten gespeichert werden. Voreingestellt ist eine lokale Docker-Instanz.",
  );
});

test("the wizard shows why the database cannot be reached", async ({
  page,
}) => {
  backend = await startApp(page, configDir);
  await page.getByLabel("Dein Name").fill("Robin");
  await page
    .getByLabel("PostgreSQL-Verbindungs-URL")
    .fill("postgresql://postgres:postgres@127.0.0.1:1/horva");
  await page.getByRole("button", { name: "Loslegen" }).click();
  // The message of the backend, not oRPC's "Internal server error".
  await expect(page.getByRole("alert")).toContainText("Failed query");
});
