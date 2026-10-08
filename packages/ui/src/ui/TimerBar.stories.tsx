import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { TimerBar } from "./TimerBar";

const meta = {
  title: "TimerBar",
  component: TimerBar,
  args: {
    todayMinutes: 372,
    weekMinutes: 1720,
    onStart: fn(),
    onSwitch: fn(),
    onStop: fn(),
  },
  render: (args) => (
    <div className="max-w-180">
      <TimerBar {...args} />
    </div>
  ),
} satisfies Meta<typeof TimerBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const running = {
  taskName: "Angebot für die Stadtwerke überarbeiten",
  project: { name: "Kundenprojekte", color: "project-7" },
  elapsedSeconds: 6127,
};

/** Idle and running, wide and at 400 px. */
export const Overview: Story = {
  render: (args) => (
    <div className="flex max-w-180 flex-col gap-3">
      <TimerBar {...args} strings={{ region: "Timer 1" }} />
      <TimerBar
        {...args}
        running={running}
        todayMinutes={414}
        strings={{ region: "Timer 2" }}
      />
      <div className="flex w-100 flex-col gap-3">
        <TimerBar {...args} strings={{ region: "Timer 3" }} />
        <TimerBar
          {...args}
          running={running}
          todayMinutes={414}
          strings={{ region: "Timer 4" }}
        />
      </div>
    </div>
  ),
};

/** No work is running: grey dot, the sums and "Arbeit starten". */
export const Idle: Story = {};

/** Work is running: orange surface, pulsing dot and the time. */
export const Running: Story = {
  args: { running, todayMinutes: 414 },
};

/** A long task name is cut off with …; the time is never cut off. */
export const LongName: Story = {
  args: {
    todayMinutes: 414,
    running: {
      ...running,
      taskName:
        "Angebot für die Stadtwerke überarbeiten und alle Rückfragen der Fachabteilung zum Wartungsvertrag klären",
    },
  },
  play: async ({ canvasElement }) => {
    const title = within(canvasElement).getByTitle(/Rückfragen/);
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(within(canvasElement).getByText("01:42:07")).toBeVisible();
  },
};

/** A running task without a project. */
export const NoProject: Story = {
  args: { running: { ...running, project: null } },
};

/** Without sums the idle bar shows only the state. */
export const NoSums: Story = {
  args: { todayMinutes: undefined, weekMinutes: undefined },
};

/** At 400 px the sums are hidden and the buttons show only their icon. */
export const NarrowIdle: Story = {
  render: (args) => (
    <div className="w-100">
      <TimerBar {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Woche/)).not.toBeVisible();
    const start = canvas.getByRole("button", { name: "Arbeit starten" });
    await expect(start.offsetWidth).toBe(start.offsetHeight);
  },
};

export const NarrowRunning: Story = {
  args: { running },
  render: (args) => (
    <div className="w-100">
      <TimerBar {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("01:42:07")).toBeVisible();
    await expect(canvas.getByText(/Heute/)).not.toBeVisible();
    const change = canvas.getByRole("button", { name: "Wechseln" });
    await expect(change.offsetWidth).toBe(change.offsetHeight);
  },
};

/** English texts, about 30 % longer. */
export const English: Story = {
  args: {
    strings: {
      idle: "Not working",
      start: "Start working",
      today: "Today",
      week: "Week",
      switch: "Switch",
      stop: "Stop",
      running: "Running",
    },
  },
};

/** The live region holds the state, never the ticking seconds. */
export const LiveRegion: Story = {
  args: { running },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toHaveTextContent(
      "Läuft: Angebot für die Stadtwerke überarbeiten",
    );
    await expect(status).not.toHaveTextContent("01:42:07");
  },
};

/** Tab reaches "Arbeit starten" with a visible ring; Enter starts. */
export const Keyboard: Story = {
  play: async ({ args, canvasElement }) => {
    const start = within(canvasElement).getByRole("button", {
      name: "Arbeit starten",
    });
    const before = (args.onStart as ReturnType<typeof fn>).mock.calls.length;
    await userEvent.tab();
    await expect(start).toHaveFocus();
    await expect(start).toHaveAttribute("data-focus-visible", "true");
    await userEvent.keyboard("{Enter}");
    await expect(
      (args.onStart as ReturnType<typeof fn>).mock.calls.length - before,
    ).toBe(1);
  },
};

/** Tab goes to "Wechseln", then "Stopp"; Space presses them. */
export const KeyboardRunning: Story = {
  args: { running },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const switchCalls = (args.onSwitch as ReturnType<typeof fn>).mock.calls
      .length;
    const stopCalls = (args.onStop as ReturnType<typeof fn>).mock.calls.length;
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Wechseln" }),
    ).toHaveFocus();
    await userEvent.keyboard(" ");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Stopp" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(
      (args.onSwitch as ReturnType<typeof fn>).mock.calls.length - switchCalls,
    ).toBe(1);
    await expect(
      (args.onStop as ReturnType<typeof fn>).mock.calls.length - stopCalls,
    ).toBe(1);
  },
};
