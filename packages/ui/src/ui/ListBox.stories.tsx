import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { ListBox, ListBoxItem } from "./ListBox";

const meta = {
  title: "ListBox",
  component: ListBox,
  args: { "aria-label": "Projekte", selectionMode: "single" },
  render: (args) => (
    <ListBox {...args}>
      <ListBoxItem id="kunde">Kundenprojekte</ListBoxItem>
      <ListBoxItem id="intern">Intern</ListBoxItem>
      <ListBoxItem id="weiterbildung">Weiterbildung</ListBoxItem>
      <ListBoxItem id="archiv" isDisabled>
        Archiv
      </ListBoxItem>
    </ListBox>
  ),
} satisfies Meta<typeof ListBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = { args: { defaultSelectedKeys: ["intern"] } };

export const Empty: Story = {};

/** Arrows move, Space selects, a disabled item is skipped. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(
      canvas.getByRole("option", { name: "Kundenprojekte" }),
    ).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    const last = canvas.getByRole("option", { name: "Weiterbildung" });
    await expect(last).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(last).toHaveAttribute("aria-selected", "true");
  },
  parameters: { screenshot: false },
};
