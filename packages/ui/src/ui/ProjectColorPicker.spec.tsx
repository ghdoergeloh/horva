import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  normalizeHex,
  PROJECT_COLOR_PRESETS,
  ProjectColorPicker,
} from "./ProjectColorPicker";

describe("normalizeHex", () => {
  it.each([
    ["2f8f83", "2F8F83"],
    ["  2F8F83 ", "2F8F83"],
    ["abc", "AABBCC"],
  ])("reads %s", (input, digits) => {
    expect(normalizeHex(input)).toBe(`#${digits}`);
    expect(normalizeHex(`#${input.trim()}`)).toBe(`#${digits}`);
  });

  it.each(["", "grün", "12345", "1234567", "ggg", "#ab"])(
    "rejects %j",
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    },
  );
});

describe("ProjectColorPicker", () => {
  it("offers the 18 presets in order", () => {
    expect(PROJECT_COLOR_PRESETS).toHaveLength(18);
    expect(PROJECT_COLOR_PRESETS[0]).toBe("project-1");
    expect(PROJECT_COLOR_PRESETS[17]).toBe("project-18");
  });

  it("shows a custom value in the field and checks no preset", () => {
    render(<ProjectColorPicker value="#2f8f83" onChange={() => undefined} />);
    expect(screen.getByRole("textbox")).toHaveValue("#2F8F83");
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("leaves the value alone when the field is emptied", () => {
    const onChange = vi.fn();
    render(<ProjectColorPicker value="project-2" onChange={onChange} />);
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: " " } });
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("does not report the chosen preset again", () => {
    const onChange = vi.fn();
    render(<ProjectColorPicker value="project-2" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Bernstein" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Petrol" }));
    expect(onChange).toHaveBeenCalledWith("project-3");
  });
});
