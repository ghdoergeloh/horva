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
  // Data from before the migration, which may break its check.
  await database.pg.exec(
    'ALTER TABLE "project" DROP CONSTRAINT "project_color_check"',
  );
  await database.db
    .insert(project)
    .values(colors.map((color, i) => ({ name: `P${String(i)}`, color })));
  // Without the check, the statements can run again on the migrated
  // database.
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

  it("maps the former colors of the CLI to tokens", async () => {
    expect(
      await migrate([
        "#e74c3c",
        "#2ecc71",
        "#3498db",
        "#f1c40f",
        "#e67e22",
        "#9b59b6",
        "#e91e63",
        "#1abc9c",
        "#95a5a6",
        "#ecf0f1",
        "#2c3e50",
      ]),
    ).toEqual([
      "project-10",
      "project-11",
      "project-13",
      "project-2",
      "project-16",
      "project-8",
      "project-14",
      "project-9",
      "project-17",
      "project-18",
      "project-15",
    ]);
  });

  it("sets project-1 for values that are neither token nor #rrggbb", async () => {
    expect(await migrate(["red", "#fff", "project-19", ""])).toEqual([
      "project-1",
      "project-1",
      "project-1",
      "project-1",
    ]);
  });

  it("rejects a color that is neither token nor #rrggbb", async () => {
    database = await createTestDatabase();
    await expect(
      database.db.insert(project).values({ name: "Bad", color: "red" }),
    ).rejects.toThrow();
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
