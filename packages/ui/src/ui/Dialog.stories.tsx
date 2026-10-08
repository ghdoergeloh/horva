import type { Meta, StoryObj } from "@storybook/react-vite";
import { DialogTrigger } from "react-aria-components";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { AlertDialog } from "./AlertDialog";
import { Button } from "./Button";
import { Modal } from "./Modal";

const meta = {
  title: "Dialog",
  component: AlertDialog,
  args: {
    title: "Aufgabe löschen?",
    children: "Die Aufgabe und ihre Slots werden gelöscht.",
    variant: "destructive",
    actionLabel: "Löschen",
    cancelLabel: "Abbrechen",
  },
  render: (args) => (
    <DialogTrigger>
      <Button variant="destructive">Löschen</Button>
      <Modal>
        <AlertDialog {...args} />
      </Modal>
    </DialogTrigger>
  ),
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The open confirmation before a delete. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(document.body).findByRole("alertdialog"),
    ).toBeInTheDocument();
  },
};

export const Closed: Story = {};

/**
 * Before a delete, focus starts on "Abbrechen"; Escape closes and returns
 * focus to the trigger.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const dialog = await within(document.body).findByRole("alertdialog");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Abbrechen" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
  parameters: { screenshot: false },
};
