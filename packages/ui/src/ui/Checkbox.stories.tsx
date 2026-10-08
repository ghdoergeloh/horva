import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { Checkbox } from "./Checkbox";

const meta = {
  title: "Checkbox",
  component: Checkbox,
  args: { children: "Send me the newsletter" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultSelected: true } };

export const Indeterminate: Story = { args: { isIndeterminate: true } };

export const WithDescription: Story = {
  args: { description: "At most one email a month." },
};

export const Invalid: Story = {
  args: {
    isRequired: true,
    isInvalid: true,
    children: "I accept the terms",
    errorMessage: "Accept the terms to go on.",
  },
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultSelected: true },
};

/** Tab focuses the box with a visible ring; Space toggles it. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox");
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(box).toBeChecked();
    await userEvent.keyboard(" ");
    await expect(box).not.toBeChecked();
  },
  parameters: { screenshot: false },
};

/** The disabled state fades the whole control once, not twice. */
export const DisabledOpacity: Story = {
  args: { isDisabled: true, defaultSelected: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll(".opacity-45")).toHaveLength(1);
  },
  parameters: { screenshot: false },
};

/** The border of a box, read while it is hovered and while it is not. */
async function bordersOnHover(canvasElement: HTMLElement) {
  const label = canvasElement.querySelector("label");
  const box = label?.querySelector("div");
  if (!label || !box) throw new Error("checkbox not found");
  await userEvent.unhover(label);
  const before = getComputedStyle(box).borderColor;
  await userEvent.hover(label);
  // Wait longer than the colour transition.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { before, after: getComputedStyle(box).borderColor };
}

/** A disabled box does not react to the pointer. */
export const DisabledHover: Story = {
  args: { isDisabled: true },
  play: async ({ canvasElement }) => {
    const { before, after } = await bordersOnHover(canvasElement);
    await expect(after).toBe(before);
  },
  parameters: { screenshot: false },
};

/** An invalid box keeps its red border on hover. */
export const InvalidHover: Story = {
  args: { isInvalid: true },
  play: async ({ canvasElement }) => {
    const { before, after } = await bordersOnHover(canvasElement);
    await expect(after).toBe(before);
  },
  parameters: { screenshot: false },
};

/** An open box shows on hover that it can be ticked. */
export const Hover: Story = {
  play: async ({ canvasElement }) => {
    const { before, after } = await bordersOnHover(canvasElement);
    await expect(after).not.toBe(before);
  },
  parameters: { screenshot: false },
};
