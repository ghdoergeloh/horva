import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, pgliteUrl } from "./client";
import { runCopy, shownUrl, toDatabaseUrl } from "./copy-command";
import { sql } from "./index";
import { migrateDatabase } from "./migrate";
import { label } from "./schema";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "horva-copy-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Opens a folder, runs `use` and closes it again. */
async function withFolder<T>(
  name: string,
  use: (db: ReturnType<typeof createDatabase>) => Promise<T>,
): Promise<T> {
  const connection = createDatabase(pgliteUrl(join(dir, name)));
  try {
    return await use(connection);
  } finally {
    await connection.close();
  }
}

async function tables(name: string): Promise<string[]> {
  return withFolder(name, async ({ db }) => {
    const result = (await db.execute(
      sql`select table_name from information_schema.tables
          where table_schema = 'public' order by table_name`,
    )) as { rows: { table_name: string }[] };
    return result.rows.map((row) => row.table_name);
  });
}

const lines: string[] = [];
const log = (line: string) => lines.push(line);

describe("toDatabaseUrl", () => {
  it("keeps URLs and turns folder paths into file URLs", () => {
    expect(toDatabaseUrl("postgres://db/horva", "/base")).toBe(
      "postgres://db/horva",
    );
    expect(toDatabaseUrl("file:///data/horva", "/base")).toBe(
      "file:///data/horva",
    );
    expect(toDatabaseUrl("/data/horva", "/base")).toBe("file:///data/horva");
    expect(toDatabaseUrl("horva-data", "/base")).toBe(
      "file:///base/horva-data",
    );
  });
});

describe("shownUrl", () => {
  it("hides the password", () => {
    expect(shownUrl("postgresql://ada:secret@db:5432/horva")).toBe(
      "postgresql://ada:***@db:5432/horva",
    );
    expect(shownUrl("file:///data/horva")).toBe("file:///data/horva");
  });
});

describe("runCopy", () => {
  it("migrates a new folder and copies the data into it", async () => {
    await withFolder("source", async (source) => {
      await migrateDatabase(source);
      await source.db.insert(label).values({ name: "db" });
    });

    await runCopy(join(dir, "source"), join(dir, "target"), { base: dir, log });

    const copied = await withFolder("target", ({ db }) =>
      db.select({ name: label.name }).from(label),
    );
    expect(copied).toEqual([{ name: "db" }]);
    expect(lines.join("\n")).toMatch(/label\s+1/);
  });

  it("leaves the target alone when the source is not up to date", async () => {
    await withFolder("source", async (source) => {
      await migrateDatabase(source);
      await source.db.execute(
        sql`delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)`,
      );
    });

    await expect(
      runCopy(join(dir, "source"), join(dir, "target"), { base: dir, log }),
    ).rejects.toThrow(/source database is not on the latest migration/);
    expect(await tables("target")).toEqual([]);
  });

  it("refuses a target with tables of another app", async () => {
    await withFolder("source", (source) => migrateDatabase(source));
    await withFolder("target", ({ db }) =>
      db.execute(sql`create table invoices (id int)`),
    );

    await expect(
      runCopy(join(dir, "source"), join(dir, "target"), { base: dir, log }),
    ).rejects.toThrow(/target database has tables of another app/);
    expect(await tables("target")).toEqual(["invoices"]);
  });

  it("does not create a missing source folder", async () => {
    await expect(
      runCopy(join(dir, "typo"), join(dir, "target"), { base: dir, log }),
    ).rejects.toThrow(/no database in .*typo/);
    expect(existsSync(join(dir, "typo"))).toBe(false);
  });

  it("refuses the same database on both sides", async () => {
    await expect(
      runCopy("horva", join(dir, "horva"), { base: dir, log }),
    ).rejects.toThrow(/same/);
  });
});
