import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "@horva/db/testing";
import { user } from "@horva/db/schema";
import { createTestDatabase } from "@horva/db/testing";

import { createLocalContext } from "./context";

let database: TestDatabase;

beforeEach(async () => {
  database = await createTestDatabase();
});

afterEach(async () => {
  await database.close();
});

describe("createLocalContext", () => {
  it("uses the local user of the setup as the session", async () => {
    await database.db.insert(user).values({
      id: "local-user",
      name: "Robin Example",
      email: "robin@example.test",
    });
    const context = await createLocalContext(database.db, "local-user");
    expect(context.session).toEqual({
      user: {
        id: "local-user",
        email: "robin@example.test",
        name: "Robin Example",
      },
    });
    expect(context.db).toBe(database.db);
  });

  it("asks for a new setup when the user row is missing", async () => {
    await expect(createLocalContext(database.db, "gone")).rejects.toThrow(
      /Re-run setup/,
    );
  });
});
