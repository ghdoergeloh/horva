import { describe, expect, it } from "vitest";

import { twMerge } from "./tw";

describe("twMerge", () => {
  it("keeps a text color next to a text style of the theme", () => {
    expect(twMerge("text-primary-foreground text-body")).toBe(
      "text-primary-foreground text-body",
    );
  });

  it("lets a later text style replace an earlier one", () => {
    expect(twMerge("text-body text-small")).toBe("text-small");
  });
});
