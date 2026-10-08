import type { Meta, StoryObj } from "@storybook/react-vite";
import { Square } from "lucide-react";
import { TooltipTrigger } from "react-aria-components";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./Button";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Tooltip",
  component: Tooltip,
  args: { children: "Stopp (S)" },
  render: (args) => (
    <div className="p-12">
      <TooltipTrigger delay={0}>
        <Button variant="secondary" aria-label="Stopp">
          <Square aria-hidden />
        </Button>
        <Tooltip {...args} />
      </TooltipTrigger>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The tooltip appears on keyboard focus, not only on hover. */
export const OnFocus: Story = {
  play: async () => {
    await userEvent.tab();
    await expect(
      await within(document.body).findByRole("tooltip"),
    ).toHaveTextContent("Stopp (S)");
  },
};

/** Escape hides the tooltip and keeps the focus on the button. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await within(document.body).findByRole("tooltip");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("tooltip")).toBeNull(),
    );
    await expect(within(canvasElement).getByRole("button")).toHaveFocus();
  },
  parameters: { screenshot: false },
};
