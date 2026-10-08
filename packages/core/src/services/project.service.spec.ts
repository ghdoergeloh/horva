import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@horva/db/client";
import type { TestDatabase } from "@horva/db/testing";
import { createTestDatabase } from "@horva/db/testing";

import { seed } from "../seed.js";
import {
  createProject,
  deleteProject,
  updateProject,
} from "./project.service.js";

let testDb: TestDatabase;
let db: Database;

beforeEach(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
});

afterEach(async () => {
  await testDb.close();
});

describe("createProject", () => {
  it("stores a given token name", async () => {
    const created = await createProject(db, {
      name: "Website",
      color: "project-12",
    });
    expect(created.color).toBe("project-12");
  });

  it("stores a given hex color", async () => {
    const created = await createProject(db, {
      name: "Website",
      color: "#12ab34",
    });
    expect(created.color).toBe("#12ab34");
  });

  it("gives new projects the first eight colors in order", async () => {
    const colors: string[] = [];
    for (const name of ["A", "B", "C"])
      colors.push((await createProject(db, { name })).color);
    expect(colors).toEqual(["project-1", "project-2", "project-3"]);
  });

  it("counts the default project of the seed", async () => {
    await seed(db);
    expect((await createProject(db, { name: "A" })).color).toBe("project-2");
  });

  it("takes the least used color", async () => {
    await createProject(db, { name: "A", color: "project-1" });
    await createProject(db, { name: "B", color: "project-1" });
    await createProject(db, { name: "C", color: "project-2" });
    expect((await createProject(db, { name: "D" })).color).toBe("project-3");
  });

  it("does not count deleted projects", async () => {
    await seed(db);
    const second = await createProject(db, { name: "A" });
    await deleteProject(db, second.id);
    expect((await createProject(db, { name: "B" })).color).toBe("project-2");
  });

  it.each(["red", "#fff", "project-19", "project-deleted"])(
    "rejects the color %s",
    async (color) => {
      await expect(createProject(db, { name: "A", color })).rejects.toThrow();
    },
  );
});

describe("updateProject", () => {
  it("changes the color to a token name", async () => {
    const created = await createProject(db, { name: "A" });
    const updated = await updateProject(db, created.id, {
      color: "project-14",
    });
    expect(updated.color).toBe("project-14");
  });

  it("rejects an invalid color", async () => {
    const created = await createProject(db, { name: "A" });
    await expect(
      updateProject(db, created.id, { color: "blue" }),
    ).rejects.toThrow();
  });
});
