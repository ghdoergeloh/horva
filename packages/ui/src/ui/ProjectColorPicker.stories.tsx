import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  clearAllMocks,
  expect,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";

import type { ProjectColorPickerProps } from "./ProjectColorPicker";
import { ProjectColorPicker } from "./ProjectColorPicker";

/** Keys that reached the elements around the picker. */
const outerKeys = fn();

/** Holds the value, as the app would, on a popover surface. */
function Harness(props: ProjectColorPickerProps) {
  const [value, setValue] = useState(props.value);
  return (
    // The spy stands for a form that reacts to Enter.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="border-border bg-popover w-max rounded-lg border p-3 shadow-md"
      onKeyDown={(e) => {
        outerKeys(e.key);
      }}
    >
      <ProjectColorPicker
        {...props}
        value={value}
        onChange={(next) => {
          props.onChange(next);
          setValue(next);
        }}
      />
    </div>
  );
}

const meta = {
  title: "ProjectColorPicker",
  component: ProjectColorPicker,
  args: { value: "project-3", onChange: fn() },
  render: (args) => <Harness {...args} />,
} satisfies Meta<typeof ProjectColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const radio = (canvas: HTMLElement, name: string) =>
  within(canvas).getByRole("radio", { name });

/** A preset is chosen: ring and check. */
export const Selected: Story = {};

export const Empty: Story = { args: { value: null } };

export const Disabled: Story = { args: { isDisabled: true } };

/** A custom hex color, typed without "#", is stored in upper case. */
export const CustomColor: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const field = within(canvasElement).getByRole("textbox", {
      name: "Eigene Farbe",
    });
    await userEvent.type(field, "2f8f83{Enter}");
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith("#2F8F83");
    // No preset is chosen any more.
    await expect(
      within(canvasElement).queryByRole("radio", { checked: true }),
    ).toBe(null);
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
};

/** Text that is no color shows an error and changes nothing. */
export const Invalid: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const field = within(canvasElement).getByRole("textbox");
    await userEvent.type(field, "grün");
    await userEvent.tab();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(
      within(canvasElement).getByText(
        "Bitte einen Hex-Wert mit sechs Stellen eingeben.",
      ),
    ).toBeInTheDocument();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/**
 * Tab reaches the chosen swatch; arrows move in the grid of six columns
 * and choose; Home and End jump to the ends.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await userEvent.tab();
    await expect(radio(canvasElement, "Petrol")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(radio(canvasElement, "Magenta")).toHaveFocus();
    await expect(args.onChange).toHaveBeenLastCalledWith("project-4");
    await userEvent.keyboard("{ArrowDown}");
    await expect(args.onChange).toHaveBeenLastCalledWith("project-10");
    await expect(radio(canvasElement, "Rot")).toBeChecked();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    // The last row stays the last row.
    await expect(args.onChange).toHaveBeenLastCalledWith("project-16");
    await userEvent.keyboard("{ArrowUp}");
    await expect(args.onChange).toHaveBeenLastCalledWith("project-10");
    await userEvent.keyboard("{End}");
    await expect(args.onChange).toHaveBeenLastCalledWith("project-18");
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenLastCalledWith("project-1");
    await userEvent.keyboard("{Home}{ArrowLeft}");
    await expect(args.onChange).toHaveBeenLastCalledWith("project-18");
    // One tab stop: Tab leaves the grid for the custom field.
    await userEvent.tab();
    await waitFor(() =>
      expect(within(canvasElement).getByRole("textbox")).toHaveFocus(),
    );
  },
  parameters: { screenshot: false },
};
