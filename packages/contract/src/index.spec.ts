import { describe, expect, it } from "vitest";

import { contract } from "./index";
import { listProcedures } from "./procedures";

const procedures = listProcedures(contract);

describe("contract", () => {
  it("lists every procedure", () => {
    expect(procedures.map((p) => p.name)).toContain("user.me");
  });

  it("gives every procedure its own method and path", () => {
    const routes = procedures.map(
      (p) =>
        `${p.procedure["~orpc"].route.method} ${p.procedure["~orpc"].route.path}`,
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("declares an output schema for every procedure", () => {
    const missing = procedures
      .filter((p) => !p.procedure["~orpc"].outputSchema)
      .map((p) => p.name);
    expect(missing).toEqual([]);
  });
});

describe("log.workPeriods", () => {
  const input = contract.log.workPeriods["~orpc"].inputSchema;

  it("accepts a range", () => {
    const range = { from: new Date(2026, 9, 5), to: new Date(2026, 9, 11) };
    expect(input?.["~standard"].validate(range)).toMatchObject({
      value: range,
    });
  });

  it("rejects a range that ends before it starts", () => {
    const range = { from: new Date(2026, 9, 11), to: new Date(2026, 9, 5) };
    expect(input?.["~standard"].validate(range)).toHaveProperty("issues");
  });
});
