import { Play } from "lucide-react";
import { describe, expect, it } from "vitest";

import { isIconOnly } from "./Button";

describe("isIconOnly", () => {
  it("is true for a single icon", () => {
    expect(isIconOnly(<Play />)).toBe(true);
  });

  it("is false for an icon with text", () => {
    expect(isIconOnly([<Play key="icon" />, "Start"])).toBe(false);
  });

  it("is false for text in a wrapper tag", () => {
    expect(isIconOnly(<span>Pause</span>)).toBe(false);
  });

  it("is false for plain text", () => {
    expect(isIconOnly("Save")).toBe(false);
  });
});
