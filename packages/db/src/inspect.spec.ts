import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "./testing";
import { sql } from "./index";
import { inspectDatabase } from "./inspect";
import * as schema from "./schema";
import { label } from "./schema";
import { createTestDatabase } from "./testing";

const open: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.close()));
});

async function migrated(): Promise<TestDatabase> {
  const created = await createTestDatabase();
  open.push(created);
  return created;
}

/** A database without any tables. */
function empty(): Pick<TestDatabase, "db"> {
  const client = new PGlite();
  open.push(client);
  return { db: drizzle({ client, schema }) };
}

describe("inspectDatabase", () => {
  it("finds no schema in a new database", async () => {
    const { db } = empty();
    expect(await inspectDatabase(db)).toEqual({
      hasSchema: false,
      migrations: "none",
      foreignTables: [],
      empty: true,
    });
  });

  it("tells an empty migrated database from one with data", async () => {
    const { db } = await migrated();
    expect(await inspectDatabase(db)).toMatchObject({
      hasSchema: true,
      migrations: "latest",
      empty: true,
    });
    await db.insert(label).values({ name: "a" });
    expect(await inspectDatabase(db)).toMatchObject({ empty: false });
  });

  it("tells an older migration from a different one", async () => {
    const { db } = await migrated();
    await db.execute(
      sql`delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)`,
    );
    expect(await inspectDatabase(db)).toMatchObject({ migrations: "behind" });

    await db.execute(
      sql`insert into drizzle.__drizzle_migrations (hash, created_at) values ('unknown', 0)`,
    );
    expect(await inspectDatabase(db)).toMatchObject({ migrations: "other" });
  });

  it("takes the same migrations in another order as the latest", async () => {
    const { db } = await migrated();
    // A repaired migration comes last in the journal.
    await db.execute(sql`
      with first as (
        delete from drizzle.__drizzle_migrations
        where id = (select min(id) from drizzle.__drizzle_migrations)
        returning hash, created_at
      )
      insert into drizzle.__drizzle_migrations (hash, created_at)
      select hash, created_at from first`);
    expect(await inspectDatabase(db)).toMatchObject({ migrations: "latest" });
  });

  it("finds Horva tables without a migration journal", async () => {
    const { db } = await migrated();
    await db.execute(sql`drop schema drizzle cascade`);
    expect(await inspectDatabase(db)).toMatchObject({
      hasSchema: true,
      migrations: "none",
    });
  });

  it("lists the tables of other apps", async () => {
    const { db } = empty();
    await db.execute(sql`create table invoices (id int)`);
    expect(await inspectDatabase(db)).toMatchObject({
      hasSchema: false,
      foreignTables: ["invoices"],
    });
  });
});
