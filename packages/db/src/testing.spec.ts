import { afterEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "./testing";
import { user } from "./schema";
import { createTestDatabase } from "./testing";

const open: TestDatabase[] = [];

async function database() {
  const created = await createTestDatabase();
  open.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.close()));
});

const ada = {
  id: "u1",
  name: "Ada Example",
  email: "ada@example.test",
};

describe("createTestDatabase", () => {
  it("applies the migrations", async () => {
    const { db } = await database();
    await db.insert(user).values(ada);
    expect(await db.select().from(user)).toMatchObject([ada]);
  });

  it("gives every call its own database", async () => {
    const first = await database();
    const second = await database();
    await first.db.insert(user).values(ada);
    expect(await second.db.select().from(user)).toEqual([]);
  });

  it("enforces the constraints of the schema", async () => {
    const { db } = await database();
    await db.insert(user).values(ada);
    await expect(
      db.insert(user).values({ ...ada, id: "u2" }),
    ).rejects.toThrow();
  });
});
