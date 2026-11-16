import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatabaseConnection } from "@horva/db/client";
import { updateConfig } from "@horva/core/config";
import { eq, sql } from "@horva/db";
import { createDatabase, pgliteUrl } from "@horva/db/client";
import { migrateDatabase } from "@horva/db/migrate";
import { label, user } from "@horva/db/schema";

import { inspectTarget, reconnectDatabase, switchDatabase } from "./switch";

// Each test opens PGlite folders; on a busy CI runner with coverage that
// takes far longer than the default 5 seconds.
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
let current: DatabaseConnection;
const opened: DatabaseConnection[] = [];
const saved = {
  XDG_CONFIG_HOME: process.env["XDG_CONFIG_HOME"],
  DATABASE_URL: process.env["DATABASE_URL"],
};

const USER_ID = "u-robin";

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "horva-switch-"));
  process.env["XDG_CONFIG_HOME"] = join(dir, "config");
  current = open(folder("current"));
  await migrateDatabase(current);
  await current.db
    .insert(user)
    .values({ id: USER_ID, name: "Robin", email: "r@horva.local" });
  await current.db.insert(label).values({ name: "mine" });
  updateConfig({ databaseUrl: folder("current"), userId: USER_ID });
}, 30_000);

afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()));
  rmSync(dir, { recursive: true, force: true });
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function folder(name: string): string {
  return pgliteUrl(join(dir, name));
}

function open(url: string): DatabaseConnection {
  const connection = createDatabase(url);
  opened.push(connection);
  return connection;
}

/** Opens `url` for one check and closes it again. */
async function withDatabase<T>(
  url: string,
  check: (c: DatabaseConnection) => Promise<T>,
): Promise<T> {
  const connection = createDatabase(url);
  try {
    return await check(connection);
  } finally {
    await connection.close();
  }
}

function deps() {
  return {
    db: current.db,
    currentUrl: folder("current"),
    reconnect: vi.fn(() => Promise.resolve()),
  };
}

describe("inspectTarget", () => {
  it("reports an empty folder as empty", async () => {
    expect(await inspectTarget(folder("new"), folder("current"))).toEqual({
      empty: true,
    });
  });

  it("reports a database with data", async () => {
    await withDatabase(folder("other"), async (c) => {
      await migrateDatabase(c);
      await c.db.insert(label).values({ name: "theirs" });
    });
    expect(await inspectTarget(folder("other"), folder("current"))).toEqual({
      empty: false,
    });
  });

  it("refuses the database in use", async () => {
    await expect(
      inspectTarget(folder("current"), folder("current")),
    ).rejects.toThrow(/already uses this database/);
  });

  it("refuses a URL that is no database URL", async () => {
    await expect(
      inspectTarget("mysql://x/horva", folder("current")),
    ).rejects.toThrow(/postgres:\/\/ or file:\/\/\//);
  });

  it("refuses a database with tables of another app", async () => {
    await withDatabase(folder("other"), (c) =>
      c.db.execute(sql`create table invoices (id int)`),
    );
    await expect(
      inspectTarget(folder("other"), folder("current")),
    ).rejects.toThrow(/tables of another app \(invoices\)/);
  });

  it("refuses Horva tables without a migration journal", async () => {
    await withDatabase(folder("other"), async (c) => {
      await migrateDatabase(c);
      await c.db.execute(sql`drop schema drizzle cascade`);
    });
    await expect(
      inspectTarget(folder("other"), folder("current")),
    ).rejects.toThrow(/no migration journal/);
  });

  it("refuses migrations of another Horva version", async () => {
    await withDatabase(folder("other"), async (c) => {
      await migrateDatabase(c);
      await c.db.execute(
        sql`insert into drizzle.__drizzle_migrations (hash, created_at) values ('next', 0)`,
      );
    });
    await expect(
      inspectTarget(folder("other"), folder("current")),
    ).rejects.toThrow(/newer version of Horva/);
  });
});

describe("switchDatabase", () => {
  it("copies the data into an empty database and uses it", async () => {
    const d = deps();
    await switchDatabase({ url: folder("new"), copy: true }, d);

    expect(d.reconnect).toHaveBeenCalledWith(folder("new"));
    await withDatabase(folder("new"), async (c) => {
      expect(await c.db.select({ name: label.name }).from(label)).toEqual([
        { name: "mine" },
      ]);
    });
    // The old database keeps its data.
    expect(await current.db.select().from(label)).toHaveLength(1);
  });

  it("starts empty without the copy, with the same user", async () => {
    const d = deps();
    await switchDatabase({ url: folder("new"), copy: false }, d);

    await withDatabase(folder("new"), async (c) => {
      expect(await c.db.select().from(label)).toEqual([]);
      expect(
        await c.db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, USER_ID)),
      ).toEqual([{ name: "Robin" }]);
    });
  });

  it("uses a database with data as it is and adds the user", async () => {
    await withDatabase(folder("other"), async (c) => {
      await migrateDatabase(c);
      await c.db.insert(label).values({ name: "theirs" });
    });
    const d = deps();
    await switchDatabase({ url: folder("other"), copy: false }, d);

    await withDatabase(folder("other"), async (c) => {
      expect(await c.db.select({ name: label.name }).from(label)).toEqual([
        { name: "theirs" },
      ]);
      expect(
        await c.db.select().from(user).where(eq(user.id, USER_ID)),
      ).toHaveLength(1);
    });
  });

  it("refuses to copy into a database with data", async () => {
    await withDatabase(folder("other"), async (c) => {
      await migrateDatabase(c);
      await c.db.insert(label).values({ name: "theirs" });
    });
    const d = deps();
    await expect(
      switchDatabase({ url: folder("other"), copy: true }, d),
    ).rejects.toThrow(/already holds data/);
    expect(d.reconnect).not.toHaveBeenCalled();
  });

  it("saves the new URL in config.json before it reconnects", async () => {
    const { readConfig } = await import("@horva/core/config");
    const d = deps();
    d.reconnect.mockImplementation(() => {
      expect(readConfig()).toMatchObject({
        databaseUrl: folder("new"),
        userId: USER_ID,
      });
      return Promise.resolve();
    });
    await switchDatabase({ url: folder("new"), copy: true }, d);
    expect(d.reconnect).toHaveBeenCalledOnce();
  });

  it("keeps the old database when the copy fails", async () => {
    const { readConfig } = await import("@horva/core/config");
    await withDatabase(folder("new"), async (c) => {
      await migrateDatabase(c);
      await c.db.execute(
        sql`alter table label add constraint no_rows check (false)`,
      );
    });
    const d = deps();
    await expect(
      switchDatabase({ url: folder("new"), copy: true }, d),
    ).rejects.toThrow();
    expect(d.reconnect).not.toHaveBeenCalled();
    expect(readConfig()?.databaseUrl).toBe(folder("current"));
  });

  it("goes back to the database in use when the app cannot start", async () => {
    const { readConfig } = await import("@horva/core/config");
    const d = deps();
    d.reconnect.mockRejectedValueOnce(new Error("no start"));
    await expect(
      switchDatabase({ url: folder("new"), copy: true }, d),
    ).rejects.toThrow("no start");
    expect(d.reconnect.mock.calls).toEqual([
      [folder("new")],
      [folder("current")],
    ]);
    expect(readConfig()?.databaseUrl).toBe(folder("current"));
  });
});

describe("reconnectDatabase", () => {
  it("sets the new URL before the old database closes", async () => {
    process.env["DATABASE_URL"] = "postgresql://old/horva";
    const seen: string[] = [];
    const close = vi.fn(() => {
      seen.push(`close: ${process.env["DATABASE_URL"]}`);
      return Promise.resolve();
    });
    const start = vi.fn(() => {
      seen.push("start");
      return Promise.resolve();
    });
    await reconnectDatabase({ close }, "postgresql://new/horva", start);
    expect(seen).toEqual(["close: postgresql://new/horva", "start"]);
  });
});
