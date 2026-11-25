import { describe, expect, it } from "vitest";

import { tv, twMerge } from "./tw";

describe("twMerge", () => {
  it("keeps a line height next to a later font size", () => {
    expect(twMerge("leading-6 text-sm")).toBe("leading-6 text-sm");
  });

  it("lets a font size with a line height replace an earlier one", () => {
    expect(twMerge("leading-6 text-sm/8")).toBe("text-sm/8");
  });

  it("still lets a later class of the same group win", () => {
    expect(twMerge("px-2 p-4")).toBe("p-4");
  });
});

describe("tv", () => {
  it("keeps a line height of the base next to a font size of a variant", () => {
    const styles = tv({
      base: "leading-6",
      variants: { small: { true: "text-sm" } },
    });
    expect(styles({ small: true })).toBe("leading-6 text-sm");
  });
});
