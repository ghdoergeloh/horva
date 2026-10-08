import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, DialogTrigger, Heading } from "react-aria-components";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./Button";
import { Popover } from "./Popover";

const meta = {
  title: "Popover",
  component: Popover,
  args: { children: null },
  render: (args) => (
    <div className="min-h-48">
      <DialogTrigger>
        <Button variant="secondary">Filter</Button>
        <Popover {...args}>
          <Dialog className="p-3 outline-0">
            <Heading slot="title" className="text-heading">
              Filter
            </Heading>
            <p className="text-body">Nur Projekte mit Zeit.</p>
            <Button size="sm" slot="close">
              Schließen
            </Button>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  ),
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toBeInTheDocument();
  },
};

export const WithArrow: Story = {
  args: { showArrow: true },
  play: Open.play,
  parameters: { screenshot: false },
};

/** Enter opens, focus moves into the popover, Escape returns it. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
  parameters: { screenshot: false },
};
