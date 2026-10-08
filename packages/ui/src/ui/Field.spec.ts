import { describe, expect, it } from "vitest";

import { fieldGroupStyles } from "./Field";

describe("fieldGroupStyles", () => {
  it("shows the focus ring when focus is inside, also after a click", () => {
    // FieldGroup passes all render props, isFocusVisible included.
    const renderProps = { isFocusWithin: true, isFocusVisible: false };
    const classes = fieldGroupStyles(renderProps).split(" ");
    expect(classes).toContain("outline-2");
    expect(classes).not.toContain("outline-0");
  });
});
