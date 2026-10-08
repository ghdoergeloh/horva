import type { Database } from "@horva/db/client";
import { project, task } from "@horva/db/schema";

// Fixtures for the service tests, which run on `createTestDatabase()` from
// `@horva/db/testing`.

export async function createProjectFixture(
  db: Database,
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
  db: Database,
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
