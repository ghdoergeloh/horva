import type { Db } from "@horva/db/client";
import { sql } from "@horva/db";
import { project, task } from "@horva/db/schema";

/**
 * slot.service.ts / task.service.ts lean on Drizzle transactions and chained
 * query-builder calls (unlike moco.service.ts's plain findMany, which a hand
 * rolled fake Db can mimic safely). Faking that surface would mean
 * re-implementing a chunk of Drizzle itself, so these tests run against a
 * real Postgres instead — `docker compose up -d postgres` + `pnpm -F
 * @horva/db migrate` locally, a `postgres` service container in CI.
 */
export async function resetDb(db: Db): Promise<void> {
  // RESTART IDENTITY only resets GENERATED ... AS IDENTITY columns; these
  // tables' ids default to nextval() on named pgSequence objects instead, so
  // the sequences need restarting explicitly or ids just keep climbing.
  await db.execute(
    sql`TRUNCATE TABLE task_moco_mapping, task_label, slot, task, label, project RESTART IDENTITY CASCADE`,
  );
  await db.execute(
    sql`ALTER SEQUENCE project_id_seq RESTART WITH 1;
        ALTER SEQUENCE task_id_seq RESTART WITH 1;
        ALTER SEQUENCE label_id_seq RESTART WITH 1;
        ALTER SEQUENCE slot_id_seq RESTART WITH 1`,
  );
}

export async function createProjectFixture(
  db: Db,
  overrides: { name?: string; isDefault?: boolean } = {},
) {
  const [row] = await db
    .insert(project)
    .values({
      name: overrides.name ?? "Test Project",
      isDefault: overrides.isDefault ?? false,
    })
    .returning();
  if (!row) throw new Error("Failed to create project fixture");
  return row;
}

export async function createTaskFixture(
  db: Db,
  projectId: number,
  overrides: {
    name?: string;
    taskType?: "task" | "activity";
    recurrenceRule?: string | null;
    status?: "open" | "done" | "archived" | "deleted";
  } = {},
) {
  const [row] = await db
    .insert(task)
    .values({
      name: overrides.name ?? "Test Task",
      projectId,
      taskType: overrides.taskType ?? "task",
      recurrenceRule: overrides.recurrenceRule ?? null,
      status: overrides.status ?? "open",
    })
    .returning();
  if (!row) throw new Error("Failed to create task fixture");
  return row;
}
