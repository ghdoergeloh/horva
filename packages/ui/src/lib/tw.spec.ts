import { describe, expect, it } from "vitest";

import { tv, twMerge } from "./tw";

describe("twMerge", () => {
  it("keeps a text color next to a text style of the theme", () => {
    expect(twMerge("text-primary-foreground text-body")).toBe(
      "text-primary-foreground text-body",
    );
  });

  it("keeps a line height next to a later font size", () => {
    expect(twMerge("leading-6 text-sm")).toBe("leading-6 text-sm");
  });

  it("lets a font size with a line height replace an earlier one", () => {
    expect(twMerge("leading-6 text-sm/8")).toBe("text-sm/8");
  });

  it("lets a later text style replace an earlier one", () => {
    expect(twMerge("text-body text-small")).toBe("text-small");
  });
});

describe("tv", () => {
  it("keeps a text color next to a text style of the theme", () => {
    const styles = tv({
      base: "text-body",
      variants: { primary: { true: "text-primary-foreground" } },
    });
    expect(styles({ primary: true })).toBe("text-body text-primary-foreground");
  });
});
