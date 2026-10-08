import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { ToggleButton } from "./ToggleButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";

const meta = {
  title: "ToggleButtonGroup",
  component: ToggleButtonGroup,
  args: {
    variant: "segmented",
    selectionMode: "single",
    disallowEmptySelection: true,
    defaultSelectedKeys: ["slots"],
    "aria-label": "Ansicht",
  },
  render: (args) => (
    <ToggleButtonGroup {...args}>
      <ToggleButton id="slots">Slots</ToggleButton>
      <ToggleButton id="tasks">Aufgaben</ToggleButton>
      <ToggleButton id="periods">Arbeitszeiten</ToggleButton>
    </ToggleButtonGroup>
  ),
} satisfies Meta<typeof ToggleButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The switch between views of the timeline. */
export const Segmented: Story = {};

export const Separate: Story = { args: { variant: "separate" } };

export const Disabled: Story = { args: { isDisabled: true } };

/** Arrow keys move between segments; Space or Enter selects one. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "Slots" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const tasks = canvas.getByRole("radio", { name: "Aufgaben" });
    await expect(tasks).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(tasks).toBeChecked();
  },
};
