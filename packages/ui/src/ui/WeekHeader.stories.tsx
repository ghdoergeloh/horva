import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { clearAllMocks, expect, fn, userEvent, within } from "storybook/test";

import type { TimelineView, WeekHeaderProps } from "./WeekHeader";
import { Select, SelectItem } from "./Select";
import { WeekHeader } from "./WeekHeader";

/** Monday, 5 October 2026, and "now" on the Thursday of that week. */
const weekStart = new Date(2026, 9, 5);
const now = new Date(2026, 9, 8, 11, 42);

const filter = (
  <Select
    aria-label="Projekt"
    placeholder="Alle Projekte"
    className="w-44 @max-lg:w-full"
  >
    <SelectItem id="all">Alle Projekte</SelectItem>
    <SelectItem id="nordlicht">Nordlicht</SelectItem>
    <SelectItem id="kranich">Kranich</SelectItem>
  </Select>
);

/** Holds the view as the app would. */
function Harness(props: WeekHeaderProps) {
  const [view, setView] = useState<TimelineView>(props.view);
  return (
    <WeekHeader
      {...props}
      view={view}
      onViewChange={(next) => {
        props.onViewChange(next);
        setView(next);
      }}
    />
  );
}

const meta = {
  title: "WeekHeader",
  component: WeekHeader,
  args: {
    weekStart,
    now,
    view: "slots",
    filter,
    onPreviousWeek: fn(),
    onNextWeek: fn(),
    onThisWeek: fn(),
    onViewChange: fn(),
  },
  render: (args) => (
    <div className="max-w-190">
      <Harness {...args} />
    </div>
  ),
} satisfies Meta<typeof WeekHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** This week: "Next week" is off, it lies in the future. */
export const ThisWeek: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "5.–11. Oktober 2026" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Nächste Woche" }),
    ).toBeDisabled();
    await expect(canvas.getByRole("radio", { name: "Slots" })).toBeChecked();
  },
};

/** An earlier week can page forward; the view "Arbeitszeiten" is on. */
export const EarlierWeek: Story = {
  args: {
    weekStart: new Date(2026, 8, 28),
    view: "periods",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "28. September – 4. Oktober 2026" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Nächste Woche" }),
    ).toBeEnabled();
  },
};

/** Without a project filter. */
export const WithoutFilter: Story = { args: { filter: undefined } };

/** On a phone the week stands on top, filter and switch below it. */
export const Narrow: Story = {
  render: (args) => (
    <div className="w-100">
      <Harness {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByRole("heading").getBoundingClientRect();
    const view = canvas.getByRole("radiogroup").getBoundingClientRect();
    await expect(view.top).toBeGreaterThan(title.bottom);
  },
};

/** The buttons page through the weeks and go back to this week. */
export const PageWeeks: Story = {
  args: { weekStart: new Date(2026, 8, 21) },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Vorherige Woche" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Nächste Woche" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Diese Woche" }));
    await expect(args.onPreviousWeek).toHaveBeenCalledTimes(1);
    await expect(args.onNextWeek).toHaveBeenCalledTimes(1);
    await expect(args.onThisWeek).toHaveBeenCalledTimes(1);
  },
  parameters: { screenshot: false },
};

/** The arrow keys move through the views and switch them. */
export const KeyboardSwitchView: Story = {
  args: { filter: undefined },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    const slots = canvas.getByRole("radio", { name: "Slots" });
    slots.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Aufgaben" })).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    const periods = canvas.getByRole("radio", { name: "Arbeitszeiten" });
    await expect(periods).toHaveFocus();
    await expect(periods).toBeChecked();
    await expect(args.onViewChange).toHaveBeenLastCalledWith("periods");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(slots).toBeChecked();
    await expect(args.onViewChange).toHaveBeenLastCalledWith("slots");
  },
  parameters: { screenshot: false },
};
