import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "./client";
import { sql } from "./index";
import { MISDATED, migrateDatabase, migrationsFolder } from "./migrate";
import * as schema from "./schema";
import { project } from "./schema";
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
    const [p] = await db
      .insert(project)
      .values({ name: "P" })
      .returning({ id: project.id });
    await db.execute(
      sql`insert into task (name, project_id, scheduled_date) values ('T', ${p?.id}, '2026-01-05 00:00')`,
    );

    await migrateDatabase({ db });

    expect(await recorded(db)).toEqual(allHashes);
    expect(await taskColumns(db)).toEqual(
      expect.arrayContaining(["scheduled_at", "recurrence_rule"]),
    );
    expect(await taskColumns(db)).not.toContain("scheduled_date");
    // 0002 moves tasks planned at midnight to 10:00.
    const result = (await db.execute(
      sql`select scheduled_at::text as at from task`,
    )) as { rows: { at: string }[] };
    expect(result.rows).toEqual([{ at: "2026-01-05 10:00:00" }]);
  });

  it("refuses a 0002 that is only half in place", async () => {
    const db = await migrated();
    await forget(db, RECURRING);
    await db.execute(sql`alter table task drop column recurrence_rule`);

    await expect(migrateDatabase({ db })).rejects.toThrow(
      /0002_recurring_activities is only partly applied/,
    );
    expect(await recorded(db)).not.toContain(files[RECURRING]?.hash);
  });

  it("records a skipped migration once when two runs meet", async () => {
    const db = await migrated();
    await forget(db, RECURRING);

    await Promise.all([migrateDatabase({ db }), migrateDatabase({ db })]);

    expect(await recorded(db)).toEqual(allHashes);
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

describe("migration journal", () => {
  // drizzle skips a migration dated before the last one a database has.
  it("dates each migration after the one before, except the known ones", () => {
    const { entries } = JSON.parse(
      readFileSync(resolve(migrationsFolder(), "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string; when: number }[] };
    let latest = 0;
    const misdated: string[] = [];
    for (const entry of entries) {
      if (entry.when <= latest) misdated.push(entry.tag);
      latest = Math.max(latest, entry.when);
    }
    expect(misdated).toEqual(Object.keys(MISDATED));
  });
});
