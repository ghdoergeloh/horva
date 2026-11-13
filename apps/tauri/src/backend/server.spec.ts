import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Contract } from "@horva/contract";
import type { TestDatabase } from "@horva/db/testing";
import { seed } from "@horva/core";
import { readConfig, writeConfig } from "@horva/core/config";
import { user } from "@horva/db/schema";
import { createTestDatabase } from "@horva/db/testing";

import type { Channel, InboundLine } from "../shared/protocol";
import type { SetupContract } from "../shared/setup-contract";
import { parseLine } from "../shared/protocol";
import { createLocalContext } from "./context";
import { router } from "./router";
import { createBackend } from "./server";
import { createSetup } from "./setup";

/**
 * The sidecar without stdio, and a webview side in the shape of
 * src/webview/backend.ts: lines go both ways through plain functions.
 */
function connect(
  database: TestDatabase,
  seedDatabase: (db: TestDatabase["db"]) => Promise<void> = seed,
) {
  const disconnect = vi.fn(() => Promise.resolve());
  const listeners: Record<Channel, ((data: string) => void)[]> = {
    setup: [],
    rpc: [],
  };
  const closed: string[] = [];
  const setup = createSetup({
    db: database.db,
    disconnect,
    seed: seedDatabase,
  });
  let handleLine: (line: string) => void = () => undefined;
  const send = (message: InboundLine) => {
    const line = JSON.stringify(message);
    // Asynchronous, like the pipe.
    queueMicrotask(() => handleLine(line));
  };
  handleLine = createBackend({
    write: (line) => {
      const message = parseLine(line);
      if (message && "data" in message)
        for (const listener of listeners[message.ch]) listener(message.data);
      if (message && "closed" in message) closed.push(message.closed);
    },
    setupRouter: setup.router,
    rpcRouter: router,
    createContext: async () => {
      const userId = readConfig()?.userId;
      if (!userId) throw new Error("Setup is not complete");
      return createLocalContext(database.db, userId);
    },
  });
  const port = (ch: Channel) => ({
    postMessage: (data: unknown) => send({ ch, data: data as string }),
    onMessage: {
      addListener: (l: (d: string) => void) => listeners[ch].push(l),
    },
    onDisconnect: { addListener: () => undefined },
  });
  return {
    boot: setup.boot,
    disconnect,
    closed,
    setupClient: createORPCClient<ContractRouterClient<SetupContract>>(
      new RPCLink({ port: port("setup") }),
    ),
    openRpc: () => {
      send({ ch: "rpc", open: true });
      return createORPCClient<ContractRouterClient<Contract>>(
        new RPCLink({ port: port("rpc") }),
      );
    },
  };
}

let database: TestDatabase;
let configHome: string;
let previousConfigHome: string | undefined;
let previousDatabaseUrl: string | undefined;

beforeEach(async () => {
  database = await createTestDatabase();
  configHome = mkdtempSync(join(tmpdir(), "horva-tauri-"));
  previousConfigHome = process.env["XDG_CONFIG_HOME"];
  previousDatabaseUrl = process.env["DATABASE_URL"];
  process.env["XDG_CONFIG_HOME"] = configHome;
});

afterEach(async () => {
  await database.close();
  rmSync(configHome, { recursive: true, force: true });
  for (const [key, value] of [
    ["XDG_CONFIG_HOME", previousConfigHome],
    ["DATABASE_URL", previousDatabaseUrl],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const URL = "postgresql://postgres:postgres@localhost:5432/horva";

describe("the backend sidecar", () => {
  it("offers the setup wizard on the first launch", async () => {
    const backend = connect(database);
    await backend.boot();
    expect(await backend.setupClient.status()).toEqual({
      ready: false,
      error: null,
      defaults: { databaseUrl: URL },
    });
  });

  it("refuses the rpc channel before the setup", async () => {
    const backend = connect(database);
    backend.openRpc();
    await vi.waitFor(() =>
      expect(backend.closed).toEqual(["Setup is not complete"]),
    );
  });

  it("creates the local user, then serves the contract", async () => {
    const backend = connect(database);
    await backend.setupClient.complete({ name: " Robin ", databaseUrl: URL });

    const cfg = readConfig();
    expect(cfg?.databaseUrl).toBe(URL);
    const rows = await database.db.select().from(user);
    expect(rows.map((row) => [row.id, row.name])).toEqual([
      [cfg?.userId, "Robin"],
    ]);
    expect((await backend.setupClient.status()).ready).toBe(true);

    const client = backend.openRpc();
    const { projects } = await client.project.list({});
    expect(projects.some((project) => project.isDefault)).toBe(true);
    expect(await client.user.me()).toMatchObject({ user: { name: "Robin" } });
  });

  it("drops the pool of an earlier try before it connects", async () => {
    const backend = connect(database);
    await backend.setupClient.complete({ name: "Robin", databaseUrl: URL });
    expect(backend.disconnect).toHaveBeenCalledOnce();
  });

  it.each([
    [{ name: "  ", databaseUrl: URL }, "Display name is required"],
    [
      { name: "Robin", databaseUrl: "mysql://x" },
      "Database URL must be a postgres:// URL",
    ],
  ])("tells the wizard what is wrong with %o", async (input, message) => {
    const backend = connect(database);
    await expect(backend.setupClient.complete(input)).rejects.toThrow(message);
    expect(readConfig()).toBeNull();
  });

  it("opens at once when config.json has a user", async () => {
    writeConfig({ databaseUrl: URL, userId: "u1" });
    const backend = connect(database);
    await backend.boot();
    expect((await backend.setupClient.status()).ready).toBe(true);
  });

  it("shows the error of the boot and recovers on retry", async () => {
    writeConfig({ databaseUrl: URL, userId: "u1" });
    const failing = vi
      .fn<(db: unknown) => Promise<void>>()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValue(undefined);
    const backend = connect(database, failing);
    await backend.boot();
    expect(await backend.setupClient.status()).toMatchObject({
      ready: false,
      error: "connection refused",
    });
    await backend.setupClient.retry();
    expect(await backend.setupClient.status()).toMatchObject({
      ready: true,
      error: null,
    });
  });

  it("passes the error of a failed retry on to the wizard", async () => {
    const backend = connect(database);
    await expect(backend.setupClient.retry()).rejects.toThrow(
      "Not configured yet",
    );
  });
});
