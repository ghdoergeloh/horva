import { describe, expect, it } from "vitest";

import { validateDatabaseUrl } from "./database-url";

describe("validateDatabaseUrl", () => {
  it("accepts PostgreSQL servers and PGlite folders", () => {
    expect(validateDatabaseUrl("postgres://localhost/horva")).toBe(true);
    expect(validateDatabaseUrl("postgresql://localhost/horva")).toBe(true);
    expect(validateDatabaseUrl("file:///Users/ada/horva-data")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(validateDatabaseUrl("mysql://localhost/horva")).toMatch(/file:/);
    expect(validateDatabaseUrl("./horva-data")).not.toBe(true);
  });
});
