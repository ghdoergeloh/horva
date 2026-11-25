import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DatabaseConnection } from "./client";
import {
  checkDatabaseUrl,
  createDatabase,
  DatabaseLockedError,
  isPgliteUrl,
  PGLITE_POSTGRES_MAJOR,
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
  it("accepts PostgreSQL and file URLs only", () => {
    expect(() => checkDatabaseUrl("postgres://h/horva")).not.toThrow();
    expect(() => checkDatabaseUrl("postgresql://h/horva")).not.toThrow();
    expect(() => checkDatabaseUrl("file:///data/horva")).not.toThrow();
    expect(() => checkDatabaseUrl("mysql://h/horva")).toThrow(
      "Database URL must be a postgres:// or file:/// URL",
    );
  });

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

  it("treats a lock without a process id as held", () => {
    const dataDir = join(dir, "data");
    writeFileSync(`${dataDir}.lock`, "");
    expect(() => openAt(dataDir)).toThrow(DatabaseLockedError);
  });

  it("refuses a folder with other files in it", () => {
    const home = join(dir, "home");
    mkdirSync(home);
    writeFileSync(join(home, "notes.txt"), "mine");
    expect(() => openAt(home)).toThrow(/not empty and holds no database/);
    expect(readdirSync(home)).toEqual(["notes.txt"]);
    expect(existsSync(`${home}.lock`)).toBe(false);
  });

  it("names the process that holds the lock", () => {
    const dataDir = join(dir, "data");
    writeFileSync(`${dataDir}.lock`, String(process.ppid));
    expect(() => openAt(dataDir)).toThrow(
      new RegExp(`process ${process.ppid}[\\s\\S]*${dataDir}\\.lock`),
    );
  });
});

describe("PGlite version", () => {
  // Local databases (the desktop app, file: URLs) are PGlite folders made
  // with PostgreSQL 18. A PGlite with another PostgreSQL major cannot open
  // them ("PGlite failed to initialize properly"). Changing this number
  // needs a migration of existing folders first.
  it("runs PostgreSQL 18, the version of existing local databases", async () => {
    expect(PGLITE_POSTGRES_MAJOR).toBe(18);
    const pglite = new PGlite();
    const result = await pglite.query<{ major: number }>(
      "select current_setting('server_version_num')::int / 10000 as major",
    );
    await pglite.close();
    expect(result.rows[0]?.major).toBe(PGLITE_POSTGRES_MAJOR);
  });

  it("names the version when a folder holds another PostgreSQL major", () => {
    const dataDir = join(dir, "db");
    mkdirSync(dataDir);
    writeFileSync(join(dataDir, "PG_VERSION"), "19\n");
    expect(() => openAt(dataDir)).toThrow(
      `The folder ${dataDir} holds a PostgreSQL 19 database. This version of horva opens PostgreSQL 18 databases only.`,
    );
  });
});
