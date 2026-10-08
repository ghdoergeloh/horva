import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeftRight, Play, Square } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "./Button";
import { Kbd } from "./Chip";

const meta = {
  title: "Button",
  component: Button,
  args: { children: "Save", onPress: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All variants and sizes side by side. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button {...args}>
          <Play aria-hidden />
          Arbeit starten
        </Button>
        <Button {...args} variant="secondary">
          <ArrowLeftRight aria-hidden />
          Wechseln
        </Button>
        <Button {...args} variant="quiet">
          Abbrechen
        </Button>
        <Button {...args} variant="destructive">
          Löschen
        </Button>
        <Button {...args} variant="secondary" aria-label="Stopp">
          <Square aria-hidden />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button {...args} size="sm">
          Speichern
        </Button>
        <Button {...args} size="sm" variant="secondary">
          Abbrechen
        </Button>
        <Button {...args} size="sm" variant="quiet" aria-label="Stopp">
          <Square aria-hidden />
        </Button>
        <Button {...args} variant="primary">
          Speichern <Kbd>↵</Kbd>
        </Button>
      </div>
    </div>
  ),
};

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

export const Quiet: Story = { args: { variant: "quiet", children: "Cancel" } };

export const Small: Story = { args: { size: "sm" } };

/** An icon-only button needs an accessible name. */
export const IconOnly: Story = {
  args: { "aria-label": "Stopp", children: <Square aria-hidden /> },
};

export const Disabled: Story = { args: { isDisabled: true } };

/**
 * While waiting the button cannot be pressed and holds a progress bar
 * "Lädt"; React Aria announces the change.
 */
export const Pending: Story = {
  args: { isPending: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(
      within(button).getByRole("progressbar", { name: "Lädt" }),
    ).toBeInTheDocument();
  },
};

/** An icon-only button that waits is named by its label and "Lädt". */
export const PendingIconOnly: Story = {
  args: {
    isPending: true,
    "aria-label": "Stopp",
    children: <Square aria-hidden />,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button"),
    ).toHaveAccessibleName("Stopp Lädt");
  },
};

/** A long label must not overflow the button. */
export const LongLabel: Story = {
  args: { children: "Save the changes and go back to the list" },
};

/** Tab focuses the button with a visible ring; Enter and Space press it. */
export const Keyboard: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    // The spy is shared by the light and the dark run.
    const before = (args.onPress as ReturnType<typeof fn>).mock.calls.length;
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute("data-focus-visible", "true");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(
      (args.onPress as ReturnType<typeof fn>).mock.calls.length - before,
    ).toBe(2);
  },
};
