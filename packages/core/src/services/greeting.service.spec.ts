import { describe, expect, it } from "vitest";

import { greet } from "./greeting.service";

describe("greet", () => {
  it("greets the user by name", () => {
    expect(greet("Ada")).toBe("Hello, Ada!");
  });

  it("falls back to Guest for a missing or blank name", () => {
    expect(greet()).toBe("Hello, Guest!");
    expect(greet(null)).toBe("Hello, Guest!");
    expect(greet("   ")).toBe("Hello, Guest!");
  });
});
