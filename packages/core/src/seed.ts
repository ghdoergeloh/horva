import type { Db } from "@timetracker/db/client";
import { eq } from "@timetracker/db";
import { project } from "@timetracker/db/schema";

export async function seed(db: Db) {
  const existing = await db.query.project.findFirst({
    where: eq(project.isDefault, true),
  });

  if (!existing) {
    await db.insert(project).values({
      name: "Default",
      color: "#6366f1",
      status: "active",
      isDefault: true,
    });
  }
}
