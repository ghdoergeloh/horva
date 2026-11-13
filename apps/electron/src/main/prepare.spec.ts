import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { DatabaseConnection } from "@horva/db/client";
import { createDatabase, pgliteUrl } from "@horva/db/client";
import { label } from "@horva/db/schema";

import { prepareDatabase } from "./prepare";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});

describe("prepareDatabase", () => {
  // Creating and migrating a PGlite folder takes seconds on a busy runner.
  it("migrates the local database", { timeout: 30_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "horva-prepare-"));
    dirs.push(dir);
    const url = pgliteUrl(join(dir, "data"));
    const connection = createDatabase(url);
    try {
      await prepareDatabase(connection, url);
      expect(await connection.db.select().from(label)).toEqual([]);
    } finally {
      await connection.close();
    }
  });

  it("leaves a PostgreSQL server to `horva migrate`", async () => {
    const untouched = new Proxy({} as DatabaseConnection, {
      get() {
        throw new Error("must not touch the server");
      },
    });
    await expect(
      prepareDatabase(untouched, "postgresql://localhost/horva"),
    ).resolves.toBeUndefined();
  });
});
