import type { Db } from "@horva/db/client";
import { eq } from "@horva/db";
import { label, taskLabel } from "@horva/db/schema";

export async function listLabels(db: Db) {
  return db.query.label.findMany({ orderBy: (l, { asc }) => [asc(l.name)] });
}

export async function getLabel(db: Db, id: number) {
  return db.query.label.findFirst({ where: eq(label.id, id) });
}

export async function getLabelByName(db: Db, name: string) {
  return db.query.label.findFirst({ where: eq(label.name, name) });
}

export async function createLabel(db: Db, name: string) {
  const existing = await getLabelByName(db, name);
  if (existing) throw new Error(`Label "${name}" already exists`);
  const [row] = await db.insert(label).values({ name }).returning();
  if (!row) throw new Error("Failed to create label");
  return row;
}

export async function deleteLabel(db: Db, id: number) {
  const existing = await getLabel(db, id);
  if (!existing) throw new Error(`Label #${id} not found`);
  // Count tasks with this label before deleting
  const taskLabels = await db
    .select()
    .from(taskLabel)
    .where(eq(taskLabel.labelId, id));
  const count = taskLabels.length;
  await db.delete(label).where(eq(label.id, id));
  return { deletedLabel: existing, affectedTasks: count };
}
