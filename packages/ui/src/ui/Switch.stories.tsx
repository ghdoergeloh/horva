import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { Switch } from "./Switch";

const meta = {
  title: "Switch",
  component: Switch,
  args: { children: "Notifications" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { defaultSelected: true } };

export const WithDescription: Story = {
  args: { description: "Get an email when someone mentions you." },
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultSelected: true },
};

/** Tab focuses the switch; Space turns it on and off. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole("switch");
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(toggle).toBeChecked();
  },
  parameters: { screenshot: false },
};
