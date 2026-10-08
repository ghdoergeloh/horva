import type { Database } from "@horva/db/client";
import { eq } from "@horva/db";
import { project } from "@horva/db/schema";

export async function seed(db: Database) {
  const existing = await db.query.project.findFirst({
    where: eq(project.isDefault, true),
  });

  if (!existing) {
    await db.insert(project).values({
      name: "Default",
      color: "project-1",
      status: "active",
      isDefault: true,
    });
  }
}
