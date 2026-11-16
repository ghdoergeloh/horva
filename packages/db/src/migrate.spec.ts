import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "./client";
import { sql } from "./index";
import { migrateDatabase, migrationsFolder } from "./migrate";
import * as schema from "./schema";
import { createTestDatabase } from "./testing";

const files = readMigrationFiles({ migrationsFolder: migrationsFolder() });
const RECURRING = 2;
const PRIORITY = 4;

const open: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.close()));
});

async function migrated(): Promise<Database> {
  const created = await createTestDatabase();
  open.push(created);
  return created.db;
}

/** The hashes in the journal of `db`, sorted. */
async function recorded(db: Database): Promise<string[]> {
  const result = (await db.execute(
    sql`select hash from drizzle.__drizzle_migrations`,
  )) as { rows: { hash: string }[] };
  return result.rows.map((row) => row.hash).sort();
}

async function forget(db: Database, index: number): Promise<void> {
  await db.execute(
    sql`delete from drizzle.__drizzle_migrations where hash = ${files[index]?.hash}`,
  );
}

async function taskColumns(db: Database): Promise<string[]> {
  const result = (await db.execute(
    sql`select column_name as name from information_schema.columns
        where table_name = 'task' order by column_name`,
  )) as { rows: { name: string }[] };
  return result.rows.map((row) => row.name);
}

const allHashes = files.map((file) => file.hash).sort();

describe("migrateDatabase", () => {
  // 0002 is dated before 0001 in the journal, so drizzle skips it on every
  // database that had 0001 before 0002 came.
  it("records a skipped 0002 whose changes are in place", async () => {
    const db = await migrated();
    await forget(db, RECURRING);
    const before = await taskColumns(db);

    await migrateDatabase({ db });

    expect(await recorded(db)).toEqual(allHashes);
    expect(await taskColumns(db)).toEqual(before);
  });

  it("applies a skipped 0002 whose changes are missing", async () => {
    const db = await migrated();
    await forget(db, RECURRING);
    await db.execute(
      sql`alter table task rename column scheduled_at to scheduled_date`,
    );
    await db.execute(sql`alter table task drop column recurrence_rule`);

    await migrateDatabase({ db });

    expect(await recorded(db)).toEqual(allHashes);
    expect(await taskColumns(db)).toEqual(
      expect.arrayContaining(["scheduled_at", "recurrence_rule"]),
    );
    expect(await taskColumns(db)).not.toContain("scheduled_date");
  });

  it("migrates a database that stopped at 0001", async () => {
    const client = new PGlite();
    open.push(client);
    const db = drizzle({ client, schema }) as unknown as Database;
    await db.execute(sql`create schema drizzle`);
    await db.execute(
      sql`create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    for (const file of files.slice(0, 2)) {
      for (const statement of file.sql) await db.execute(sql.raw(statement));
      await db.execute(
        sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${file.hash}, ${file.folderMillis})`,
      );
    }

    await migrateDatabase({ db });

    expect(await recorded(db)).toEqual(allHashes);
    expect(await taskColumns(db)).toContain("recurrence_rule");
  });

  it("refuses any other skipped migration", async () => {
    const db = await migrated();
    await forget(db, PRIORITY);

    await expect(migrateDatabase({ db })).rejects.toThrow(
      /0004_task_priority was skipped/,
    );
  });
});
