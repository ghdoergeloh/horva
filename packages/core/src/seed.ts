import type { Db } from "@repo/db/client";
import { eq } from "@repo/db";
import { project } from "@repo/db/schema";

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
