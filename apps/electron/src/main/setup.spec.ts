import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IpcMain } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TestDatabase } from "@horva/db/testing";
import { readConfig } from "@horva/core/config";
import { user } from "@horva/db/schema";
import { createTestDatabase } from "@horva/db/testing";

import { registerSetupHandlers } from "./setup";

type Handler = Parameters<IpcMain["handle"]>[1];

const URL = "postgresql://postgres:postgres@localhost:5432/horva";

let database: TestDatabase;
let configHome: string;
const saved = {
  XDG_CONFIG_HOME: process.env["XDG_CONFIG_HOME"],
  DATABASE_URL: process.env["DATABASE_URL"],
};

beforeEach(async () => {
  database = await createTestDatabase();
  configHome = mkdtempSync(join(tmpdir(), "horva-electron-"));
  process.env["XDG_CONFIG_HOME"] = configHome;
});

afterEach(async () => {
  await database.close();
  rmSync(configHome, { recursive: true, force: true });
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** The handlers as the main process registers them, with a fake ipcMain. */
function setup() {
  const handlers = new Map<string, Handler>();
  const calls: string[] = [];
  const disconnect = vi.fn(() => {
    calls.push(`disconnect (DATABASE_URL=${process.env["DATABASE_URL"]})`);
    return Promise.resolve();
  });
  const onReady = vi.fn(() => {
    calls.push(`onReady (DATABASE_URL=${process.env["DATABASE_URL"]})`);
    return Promise.resolve();
  });
  registerSetupHandlers(
    { handle: (channel, handler) => handlers.set(channel, handler) },
    { db: database.db, disconnect, onReady },
  );
  const invoke = (channel: string, ...args: unknown[]) => {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`no handler for ${channel}`);
    return handler({} as Parameters<Handler>[0], ...args) as Promise<unknown>;
  };
  return { invoke, calls };
}

describe("setup:complete", () => {
  it("closes the pool of an earlier try before it connects", async () => {
    process.env["DATABASE_URL"] = "postgresql://wrong@localhost:1/horva";
    const { invoke, calls } = setup();
    await invoke("setup:complete", { name: "Robin", databaseUrl: URL });
    expect(calls).toEqual([
      "disconnect (DATABASE_URL=postgresql://wrong@localhost:1/horva)",
      `onReady (DATABASE_URL=${URL})`,
    ]);
  });

  it("creates the local user and writes config.json", async () => {
    const { invoke } = setup();
    await invoke("setup:complete", { name: " Robin ", databaseUrl: URL });
    const cfg = readConfig();
    expect(cfg?.databaseUrl).toBe(URL);
    const rows = await database.db.select().from(user);
    expect(rows.map((row) => [row.id, row.name])).toEqual([
      [cfg?.userId, "Robin"],
    ]);
    expect(await invoke("setup:status")).toMatchObject({ ready: true });
  });

  it("renames the user on a second setup", async () => {
    const { invoke } = setup();
    await invoke("setup:complete", { name: "Robin", databaseUrl: URL });
    await invoke("setup:complete", { name: "Robin Example", databaseUrl: URL });
    const rows = await database.db.select().from(user);
    expect(rows.map((row) => row.name)).toEqual(["Robin Example"]);
  });

  it("refuses an empty name", async () => {
    const { invoke } = setup();
    await expect(
      invoke("setup:complete", { name: "  ", databaseUrl: URL }),
    ).rejects.toThrow("Display name is required");
  });

  it("refuses a URL that is not PostgreSQL", async () => {
    const { invoke } = setup();
    await expect(
      invoke("setup:complete", { name: "Robin", databaseUrl: "mysql://x" }),
    ).rejects.toThrow("Database URL must be a postgres:// URL");
    expect(readConfig()).toBeNull();
  });
});

describe("setup:retry", () => {
  it("needs a finished setup", async () => {
    const { invoke } = setup();
    await expect(invoke("setup:retry")).rejects.toThrow("Not configured yet");
  });

  it("seeds again with the URL of config.json", async () => {
    const { invoke } = setup();
    await invoke("setup:complete", { name: "Robin", databaseUrl: URL });
    process.env["DATABASE_URL"] = "postgresql://other@localhost:1/horva";
    await invoke("setup:retry");
    expect(process.env["DATABASE_URL"]).toBe(URL);
    expect(await invoke("setup:status")).toMatchObject({
      ready: true,
      error: null,
      defaults: { databaseUrl: URL },
    });
  });

  it("shows the error of a failed seed in the status", async () => {
    const { invoke } = setup();
    await invoke("setup:complete", { name: "Robin", databaseUrl: URL });
    await database.pg.exec("DROP TABLE project CASCADE");
    await expect(invoke("setup:retry")).rejects.toThrow();
    const status = (await invoke("setup:status")) as { error: string | null };
    expect(status.error).toMatch(/project/);
  });
});
