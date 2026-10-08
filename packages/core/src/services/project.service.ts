import type { Database } from "@horva/db/client";
import { eq, inArray, ne } from "@horva/db";
import { project, task } from "@horva/db/schema";

import type { CreateProject, UpdateProject } from "../schemas/index.js";
import { nextProjectColor } from "../lib/project-colors.js";
import { createProjectSchema, updateProjectSchema } from "../schemas/index.js";

export async function listProjects(db: Database, includeArchived = false) {
  const rows = await db.query.project.findMany({
    where: includeArchived
      ? ne(project.status, "deleted")
      : eq(project.status, "active"),
    orderBy: (p, { asc }) => [asc(p.id)],
  });
  return rows;
}

export async function getProject(db: Database, id: number) {
  return db.query.project.findFirst({ where: eq(project.id, id) });
}

export async function getDefaultProject(db: Database) {
  return db.query.project.findFirst({ where: eq(project.isDefault, true) });
}

/**
 * Creates a project. Without a color it gets the least used of
 * `project-1` … `project-8` among the projects that are not deleted.
 */
export async function createProject(db: Database, input: CreateProject) {
  const { name, color } = createProjectSchema.parse(input);
  const [row] = await db
    .insert(project)
    .values({ name, color: color ?? (await nextColor(db)) })
    .returning();
  if (!row) throw new Error("Failed to create project");
  return row;
}

export async function updateProject(
  db: Database,
  id: number,
  input: UpdateProject,
) {
  const changes = updateProjectSchema.parse(input);
  const existing = await getProject(db, id);
  if (!existing) throw new Error(`Project #${id} not found`);
  const [row] = await db
    .update(project)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(project.id, id))
    .returning();
  if (!row) throw new Error(`Project #${id} not found after update`);
  return row;
}

export async function archiveProject(db: Database, id: number) {
  const existing = await getProject(db, id);
  if (!existing) throw new Error(`Project #${id} not found`);
  if (existing.isDefault) throw new Error("Cannot archive the default project");
  const [row] = await db
    .update(project)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(project.id, id))
    .returning();
  if (!row) throw new Error(`Project #${id} not found after archive`);
  return row;
}

export async function deleteProject(db: Database, id: number) {
  const existing = await getProject(db, id);
  if (!existing) throw new Error(`Project #${id} not found`);
  if (existing.isDefault) throw new Error("Cannot delete the default project");

  const defaultProject = await getDefaultProject(db);
  if (!defaultProject) throw new Error("Default project not found");
  const defaultId = defaultProject.id;

  return db.transaction(async (tx) => {
    // Reassign tasks to default project
    const affectedTasks = await tx
      .select({ id: task.id })
      .from(task)
      .where(eq(task.projectId, id));

    if (affectedTasks.length > 0) {
      await tx
        .update(task)
        .set({ projectId: defaultId, updatedAt: new Date() })
        .where(
          inArray(
            task.id,
            affectedTasks.map((t) => t.id),
          ),
        );
    }

    const [row] = await tx
      .update(project)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning();
    if (!row) throw new Error(`Project #${id} not found after delete`);
    return row;
  });
}

async function nextColor(db: Database): Promise<string> {
  const rows = await db
    .select({ color: project.color })
    .from(project)
    .where(ne(project.status, "deleted"));
  return nextProjectColor(rows.map((row) => row.color));
}
