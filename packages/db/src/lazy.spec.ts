import { describe, expect, it } from "vitest";

import { createLazyDatabase } from "./lazy";
import { project } from "./schema/index";

describe("createLazyDatabase", () => {
  it("reads the URL only on the first query", () => {
    let reads = 0;
    const connection = createLazyDatabase(() => {
      reads += 1;
      return undefined;
    });
    expect(reads).toBe(0);
    expect(() => connection.db.select()).toThrow("DATABASE_URL is not set");
    expect(reads).toBe(1);
  });

  it("builds queries on the pool it opens", async () => {
    const connection = createLazyDatabase(
      () => "postgresql://unused@localhost/unused",
    );
    // Building a query needs no server; the methods stay bound to drizzle.
    const { sql } = connection.db.select().from(project).toSQL();
    expect(sql).toMatch(/from "project"/);
    await connection.close();
  });

  it("closes without a pool", async () => {
    const connection = createLazyDatabase(() => undefined);
    await expect(connection.close()).resolves.toBeUndefined();
  });
});
