import { call, isProcedure } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "@horva/db/testing";
import { contract, listProcedures } from "@horva/contract";
import { seed } from "@horva/core";
import { createTestDatabase } from "@horva/db/testing";

import type { LocalContext } from "./context";
import { router } from "./router";

/** The implementation of `path` in the router, if there is one. */
function procedureAt(path: string[]): unknown {
  return path.reduce<unknown>(
    (node, key) =>
      node !== null && typeof node === "object"
        ? (node as Record<string, unknown>)[key]
        : undefined,
    router,
  );
}

describe("the Electron router", () => {
  it.each(listProcedures(contract).map((p) => [p.name, p.path] as const))(
    "implements %s",
    (_name, path) => {
      expect(isProcedure(procedureAt(path))).toBe(true);
    },
  );

  describe("with a database", () => {
    let database: TestDatabase;
    let context: LocalContext;

    beforeEach(async () => {
      database = await createTestDatabase();
      context = {
        db: database.db,
        session: {
          user: { id: "u1", email: "robin@example.test", name: "Robin" },
        },
      };
    });

    afterEach(async () => {
      await database.close();
    });

    it("lists the projects of the local database", async () => {
      await seed(database.db);
      const { projects } = await call(router.project.list, {}, { context });
      expect(projects.map((p) => p.isDefault)).toContain(true);
    });
  });
});
