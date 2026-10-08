import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal } from "lucide-react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./Button";
import { Menu, MenuItem, MenuSeparator, MenuTrigger } from "./Menu";

const meta = {
  title: "Menu",
  component: Menu,
  args: { onAction: fn() },
  render: (args) => (
    <div className="min-h-56">
      <MenuTrigger>
        <Button variant="quiet" aria-label="Mehr">
          <MoreHorizontal aria-hidden />
        </Button>
        <Menu {...args}>
          <MenuItem id="edit">Bearbeiten</MenuItem>
          <MenuItem id="today">Für heute einplanen</MenuItem>
          <MenuSeparator />
          <MenuItem id="delete">Löschen</MenuItem>
        </Menu>
      </MenuTrigger>
    </div>
  ),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(document.body).findByRole("menu"),
    ).toBeInTheDocument();
  },
};

/** Enter opens the menu, arrows move, Enter runs the item and closes. */
export const Keyboard: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const menu = await within(document.body).findByRole("menu");
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Bearbeiten" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      within(menu).getByRole("menuitem", { name: "Für heute einplanen" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenLastCalledWith("today", undefined);
    // Escape closes without an action and gives focus back to the trigger.
    const trigger = within(canvasElement).getByRole("button", { name: "Mehr" });
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await within(document.body).findByRole("menu");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
  parameters: { screenshot: false },
};
