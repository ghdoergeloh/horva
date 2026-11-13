import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Database } from "./client";
import type { PostgresTestDatabase, TestDatabase } from "./testing";
import { copyDatabase } from "./copy";
import { sql } from "./index";
import {
  account,
  label,
  project,
  session,
  slot,
  task,
  taskLabel,
  taskMocoMapping,
  user,
  verification,
} from "./schema";
import { createPostgresTestDatabase, createTestDatabase } from "./testing";

const open: { close(): Promise<void> }[] = [];

async function database(): Promise<TestDatabase> {
  const created = await createTestDatabase();
  open.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.close()));
});

/** One row in every table, with the ids from the sequences. */
async function fill(db: Database): Promise<void> {
  const now = new Date("2026-11-13T09:00:00Z");
  await db.insert(user).values({ id: "u1", name: "Ada", email: "a@x.test" });
  await db.insert(session).values({
    id: "s1",
    token: "t1",
    userId: "u1",
    expiresAt: now,
  });
  await db.insert(account).values({
    id: "a1",
    accountId: "a1",
    providerId: "credential",
    userId: "u1",
  });
  await db
    .insert(verification)
    .values({ id: "v1", identifier: "i", value: "v", expiresAt: now });
  const [p] = await db
    .insert(project)
    .values({ name: "Horva" })
    .returning({ id: project.id });
  const [t] = await db
    .insert(task)
    .values({ name: "Copy", projectId: p?.id ?? 0 })
    .returning({ id: task.id });
  const [l] = await db
    .insert(label)
    .values({ name: "db" })
    .returning({ id: label.id });
  const taskId = t?.id ?? 0;
  await db.insert(taskLabel).values({ taskId, labelId: l?.id ?? 0 });
  await db.insert(taskMocoMapping).values({ taskId, mocoTaskId: 7 });
  await db.insert(slot).values({ startedAt: now, endedAt: now, taskId });
}

const tables = {
  user,
  session,
  account,
  verification,
  project,
  task,
  label,
  taskLabel,
  taskMocoMapping,
  slot,
};

async function contents(db: Database): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(tables)) {
    result[name] = await db.select().from(table);
  }
  return result;
}

async function expectSameData(source: Database, target: Database) {
  const copied = await contents(target);
  expect(copied).toEqual(await contents(source));
  for (const rows of Object.values(copied)) expect(rows).toHaveLength(1);
}

describe("copyDatabase", () => {
  it("copies every table and keeps the ids", async () => {
    const source = await database();
    const target = await database();
    await fill(source.db);

    const report = await copyDatabase(source.db, target.db);

    await expectSameData(source.db, target.db);
    expect(report.rows).toMatchObject({ task: 1, slot: 1, user: 1 });
  });

  it("continues the sequences after the copied ids", async () => {
    const source = await database();
    const target = await database();
    await fill(source.db);
    await copyDatabase(source.db, target.db);

    const [next] = await target.db
      .insert(label)
      .values({ name: "after" })
      .returning({ id: label.id });
    const [inSource] = await source.db
      .insert(label)
      .values({ name: "after" })
      .returning({ id: label.id });
    expect(next?.id).toBeGreaterThan(1);
    expect(next?.id).toBe(inSource?.id);
  });

  it("keeps timestamps to the microsecond", async () => {
    const source = await database();
    const target = await database();
    await source.db.execute(
      sql`insert into slot (started_at, state) values ('2026-01-01 10:00:00.123456', 'active')`,
    );
    await copyDatabase(source.db, target.db);

    const read = (db: Database) =>
      db.execute(sql`select started_at::text as value from slot`);
    expect(await read(target.db)).toMatchObject({
      rows: [{ value: "2026-01-01 10:00:00.123456" }],
    });
  });

  it("refuses a target that has data", async () => {
    const source = await database();
    const target = await database();
    await fill(source.db);
    await target.db.insert(label).values({ name: "old" });

    await expect(copyDatabase(source.db, target.db)).rejects.toThrow(
      /target database is not empty \(label\)/,
    );
    expect(await target.db.select().from(task)).toEqual([]);
  });

  it("refuses databases with different migrations", async () => {
    const source = await database();
    const target = await database();
    await source.db.execute(
      sql`delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)`,
    );

    await expect(copyDatabase(source.db, target.db)).rejects.toThrow(
      /not on the same migration/,
    );
  });

  it("reads the source in one read-only snapshot", async () => {
    const source = await database();
    const target = await database();
    const transaction = vi.spyOn(source.db, "transaction");
    await copyDatabase(source.db, target.db);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });
  });

  it("leaves the target empty when a row fails", async () => {
    const source = await database();
    const target = await database();
    await fill(source.db);
    // A constraint only the target has makes the last table fail.
    await target.db.execute(
      sql`alter table slot add constraint no_rows check (false)`,
    );

    await expect(copyDatabase(source.db, target.db)).rejects.toThrow();
    expect(await target.db.select().from(user)).toEqual([]);
  });
});

/**
 * The same copy between PGlite and a real PostgreSQL server, in both
 * directions. CI sets `TEST_DATABASE_URL`.
 */
const adminUrl = process.env["TEST_DATABASE_URL"];

describe.skipIf(!adminUrl)("copyDatabase with PostgreSQL", () => {
  let server: PostgresTestDatabase;

  beforeAll(async () => {
    server = await createPostgresTestDatabase(adminUrl ?? "");
  });

  afterAll(async () => {
    await server.close();
  });

  it("copies from PGlite to PostgreSQL and back", async () => {
    const pglite = await database();
    const back = await database();
    await fill(pglite.db);

    await copyDatabase(pglite.db, server.db);
    await expectSameData(pglite.db, server.db);

    await copyDatabase(server.db, back.db);
    await expectSameData(pglite.db, back.db);
  });
});
