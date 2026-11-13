import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DatabaseConnection } from "./client";
import {
  createDatabase,
  DatabaseLockedError,
  isPgliteUrl,
  pgliteUrl,
} from "./client";
import { migrateDatabase } from "./migrate";
import { user } from "./schema";

let dir: string;
const open: DatabaseConnection[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "horva-pglite-"));
});

afterEach(async () => {
  await Promise.all(open.splice(0).map((c) => c.close()));
  rmSync(dir, { recursive: true, force: true });
});

function openAt(dataDir: string): DatabaseConnection {
  const connection = createDatabase(pgliteUrl(dataDir));
  open.push(connection);
  return connection;
}

const ada = { id: "u1", name: "Ada Example", email: "ada@example.test" };

describe("database URLs", () => {
  it("tells file URLs from PostgreSQL URLs", () => {
    expect(isPgliteUrl(pgliteUrl("/tmp/horva"))).toBe(true);
    expect(isPgliteUrl("postgresql://localhost/horva")).toBe(false);
    expect(isPgliteUrl("postgres://localhost/horva")).toBe(false);
  });
});

describe("createDatabase with a file URL (PGlite)", () => {
  it("migrates, answers ping and keeps the data after a restart", async () => {
    const dataDir = join(dir, "data");
    const first = openAt(dataDir);
    await migrateDatabase(first);
    await first.ping();
    await first.db.insert(user).values(ada);
    await first.close();

    const second = openAt(dataDir);
    expect(await second.db.select().from(user)).toMatchObject([ada]);
  });

  it("refuses a second connection to the same folder", async () => {
    const dataDir = join(dir, "data");
    const first = openAt(dataDir);
    await first.ping();
    expect(() => openAt(dataDir)).toThrow(DatabaseLockedError);
  });

  it("allows a new connection after close", async () => {
    const dataDir = join(dir, "data");
    const first = openAt(dataDir);
    await first.ping();
    await first.close();
    await first.close();
    expect(existsSync(`${dataDir}.lock`)).toBe(false);
    await openAt(dataDir).ping();
  });

  it("takes over the lock of a process that no longer runs", async () => {
    const dataDir = join(dir, "data");
    const ended = spawn(process.execPath, ["-e", ""]);
    const pid = ended.pid ?? 0;
    await new Promise((resolve) => ended.on("exit", resolve));
    writeFileSync(`${dataDir}.lock`, String(pid));
    await openAt(dataDir).ping();
  });

  it("names the process that holds the lock", () => {
    const dataDir = join(dir, "data");
    writeFileSync(`${dataDir}.lock`, String(process.ppid));
    expect(() => openAt(dataDir)).toThrow(
      new RegExp(`process ${process.ppid}`),
    );
  });
});
