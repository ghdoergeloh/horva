import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "./testing";
import { migrationsFolder } from "./migrate";
import { project } from "./schema";
import { createTestDatabase } from "./testing";

const migration = readFileSync(
  resolve(migrationsFolder(), "0005_project_color_tokens.sql"),
  "utf8",
);

let database: TestDatabase | undefined;

afterEach(async () => {
  await database?.close();
});

/** The colors of projects stored with `colors`, after the migration ran. */
async function migrate(colors: string[]): Promise<string[]> {
  database = await createTestDatabase();
  await database.db
    .insert(project)
    .values(colors.map((color, i) => ({ name: `P${String(i)}`, color })));
  // The statements change nothing on a second run, so they can run again
  // on the migrated database.
  await database.pg.exec(migration.replaceAll("--> statement-breakpoint", ""));
  const rows = await database.db
    .select({ color: project.color })
    .from(project)
    .orderBy(project.id);
  return rows.map((row) => row.color);
}

describe("migration 0005: project colors as tokens", () => {
  it("maps the former presets to tokens", async () => {
    expect(
      await migrate([
        "#6366f1",
        "#8b5cf6",
        "#ec4899",
        "#ef4444",
        "#f97316",
        "#eab308",
        "#22c55e",
        "#14b8a6",
        "#3b82f6",
        "#64748b",
      ]),
    ).toEqual([
      "project-1",
      "project-8",
      "project-14",
      "project-10",
      "project-16",
      "project-2",
      "project-11",
      "project-3",
      "project-13",
      "project-17",
    ]);
  });

  it("maps presets in upper case, as the old color field stored them", async () => {
    expect(await migrate(["#6366F1", "#14B8A6"])).toEqual([
      "project-1",
      "project-3",
    ]);
  });

  it("keeps custom colors and tokens", async () => {
    expect(await migrate(["#123456", "project-5"])).toEqual([
      "#123456",
      "project-5",
    ]);
  });

  it("gives a new project the token project-1", async () => {
    database = await createTestDatabase();
    const [row] = await database.db
      .insert(project)
      .values({ name: "New" })
      .returning();
    expect(row?.color).toBe("project-1");
  });
});
