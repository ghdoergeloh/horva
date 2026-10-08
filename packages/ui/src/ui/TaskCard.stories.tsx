import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal } from "lucide-react";
import { Dialog } from "react-aria-components";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./Button";
import { Popover } from "./Popover";
import { TaskCard } from "./TaskCard";

const callbacks = {
  onToggleDone: fn(),
  onActivityDone: fn(),
  onStart: fn(),
  onStop: fn(),
  onPlanToday: fn(),
  onDateClick: fn(),
};

const meta = {
  title: "TaskCard",
  component: TaskCard,
  args: {
    title: "Rechnung an Kranich schreiben",
    project: { name: "Kranich", color: "project-7" },
    labels: ["abrechnung"],
    totalMinutes: 0,
    ...callbacks,
  },
  render: (args) => (
    <div className="max-w-170">
      <TaskCard {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

type Spy = ReturnType<typeof fn>;

/** Counts the calls of a spy from now on; light and dark share the spies. */
function counter(spy: unknown) {
  const before = (spy as Spy).mock.calls.length;
  return () => (spy as Spy).mock.calls.length - before;
}

const more = (
  <Button variant="quiet" size="sm" aria-label="Mehr">
    <MoreHorizontal aria-hidden />
  </Button>
);

/** Running, open, overdue, activity and done, one below the other. */
export const Overview: Story = {
  render: (args) => (
    <ul className="flex max-w-170 flex-col gap-2">
      <li>
        <TaskCard
          {...args}
          title="Angebot für die Stadtwerke überarbeiten"
          project={{ name: "Kundenprojekte", color: "project-3" }}
          labels={[]}
          isRunning
          isPlannedToday
          dateLabel="Heute"
          totalMinutes={102}
        />
      </li>
      <li>
        <TaskCard {...args} actions={more} />
      </li>
      <li>
        <TaskCard
          {...args}
          title="Reisekosten September einreichen"
          project={{ name: "Intern", color: "project-1" }}
          labels={[]}
          isOverdue
          dateLabel="gestern 17:00"
          totalMinutes={25}
        />
      </li>
      <li>
        <TaskCard
          {...args}
          kind="activity"
          title="Nachrichten lesen"
          project={{ name: "Intern", color: "project-1" }}
          labels={[]}
          activityInfo="wochentags 09:00"
          isPlannedToday
          totalMinutes={7}
        />
      </li>
      <li>
        <TaskCard
          {...args}
          isDone
          title="Zeitleiste: Stundenskala ausrichten"
          project={{ name: "Horva", color: "project-8" }}
          labels={[]}
          totalMinutes={48}
        />
      </li>
    </ul>
  ),
};

/** An open task without a date: dashed date chip. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const start = within(canvasElement).getByRole("button", {
      name: "Starten",
    });
    const icon = start.querySelector("svg");
    await expect(icon?.getBoundingClientRect().width).toBe(12);
  },
};

/** A running task: orange surface, "läuft" and a stop button. */
export const Running: Story = {
  args: {
    isRunning: true,
    isPlannedToday: true,
    dateLabel: "Heute",
    totalMinutes: 102,
  },
};

/** The date has passed: the chip turns red with a crossed calendar. */
export const Overdue: Story = {
  args: { isOverdue: true, dateLabel: "gestern 17:00", totalMinutes: 25 },
};

/** An activity repeats: a repeat icon instead of the checkbox. */
export const Activity: Story = {
  args: {
    kind: "activity",
    title: "Nachrichten lesen",
    labels: [],
    activityInfo: "wochentags 09:00",
    totalMinutes: 7,
  },
};

export const RunningActivity: Story = {
  args: { ...Activity.args, isRunning: true },
};

/** Done: success check, struck-through title, no start button. */
export const Done: Story = {
  args: { isDone: true, totalMinutes: 48 },
};

/** Planned for another day: a solid date chip. */
export const Planned: Story = {
  args: { dateLabel: "Fr 10.10." },
};

/** Without project, labels, time or callbacks for planning. */
export const Minimal: Story = {
  args: {
    project: null,
    labels: [],
    totalMinutes: undefined,
    onPlanToday: undefined,
    onDateClick: undefined,
  },
};

/** A long title wraps; long project names are cut off. */
export const LongTitle: Story = {
  args: {
    title:
      "Unterschiedliches Routing nicht exponierter Routen im Testsystem untersuchen und die Ergebnisse für das Team zusammenfassen (Ticket 158)",
    project: {
      name: "Ein sehr langer Projektname, der gekürzt wird",
      color: "project-2",
    },
    labels: ["recherche", "infrastruktur", "dringend"],
    totalMinutes: 95,
  },
};

/** At 400 px the meta line wraps. */
export const Narrow: Story = {
  args: LongTitle.args,
  render: (args) => (
    <div className="w-100">
      <TaskCard {...args} />
    </div>
  ),
};

/** "Heute" and more actions appear on keyboard focus, not only on hover. */
export const ActionsOnFocus: Story = {
  args: { actions: more },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const today = canvas.getByRole("button", { name: "Heute" });
    const actions = today.parentElement as HTMLElement;
    await expect(getComputedStyle(actions).opacity).toBe("0");
    await userEvent.tab();
    await expect(canvas.getByRole("group")).toHaveFocus();
    await waitFor(() => expect(getComputedStyle(actions).opacity).toBe("1"));
  },
};

/** The date chip opens the popover that the app passes in. */
export const DatePopover: Story = {
  args: {
    dateLabel: "Fr 10.10.",
    datePopover: (
      <Popover placement="bottom start">
        <Dialog aria-label="Datum wählen" className="p-3 outline-0">
          Kalender
        </Dialog>
      </Popover>
    ),
  },
  render: (args) => (
    <div className="min-h-40 max-w-170">
      <TaskCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Datum: Fr 10.10." }),
    );
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toHaveTextContent("Kalender");
  },
};

/**
 * With the card focused: Space ticks it off, S starts, H plans it for
 * today, D opens the date.
 */
export const Keyboard: Story = {
  play: async ({ args, canvasElement }) => {
    const done = counter(args.onToggleDone);
    const start = counter(args.onStart);
    const today = counter(args.onPlanToday);
    const date = counter(args.onDateClick);
    await userEvent.tab();
    const card = within(canvasElement).getByRole("group");
    await expect(card).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(done()).toBe(1);
    await expect(args.onToggleDone).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard("s");
    await expect(start()).toBe(1);
    await userEvent.keyboard("h");
    await expect(today()).toBe(1);
    await userEvent.keyboard("d");
    await expect(date()).toBe(1);
  },
  parameters: { screenshot: false },
};

/** S stops a running task; D opens the date popover. */
export const KeyboardRunning: Story = {
  args: {
    ...Running.args,
    datePopover: DatePopover.args?.datePopover,
  },
  render: DatePopover.render,
  play: async ({ args }) => {
    const stop = counter(args.onStop);
    await userEvent.tab();
    await userEvent.keyboard("s");
    await expect(stop()).toBe(1);
    await userEvent.keyboard("d");
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toBeInTheDocument();
  },
  parameters: { screenshot: false },
};

/** Tab order: card, checkbox, start, date chip, "Heute". */
export const KeyboardTabOrder: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const start = counter(args.onStart);
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("checkbox")).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Starten" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(start()).toBe(1);
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Datum: Datum" }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Heute" })).toHaveFocus();
  },
  parameters: { screenshot: false },
};

/**
 * An activity has no checkbox: Space marks it done for today (it moves on
 * to its next date) and never ticks it off; S still starts.
 */
export const KeyboardActivity: Story = {
  args: Activity.args,
  play: async ({ args }) => {
    const done = counter(args.onToggleDone);
    const activityDone = counter(args.onActivityDone);
    const start = counter(args.onStart);
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("s");
    await expect(done()).toBe(0);
    await expect(activityDone()).toBe(1);
    await expect(start()).toBe(1);
  },
  parameters: { screenshot: false },
};

/** The repeat button in front of an activity marks it done for today. */
export const ActivityDoneButton: Story = {
  args: Activity.args,
  play: async ({ args, canvasElement }) => {
    const activityDone = counter(args.onActivityDone);
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Für heute erledigt" }),
    );
    await expect(activityDone()).toBe(1);
  },
  parameters: { screenshot: false },
};

/** Hovering the checkbox shows that it ticks the task off. */
export const CheckboxHover: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox");
    const target = box.closest("label") ?? box;
    const visual = target.querySelector("div");
    const preview = visual?.querySelector("svg");
    if (!visual || !preview) throw new Error("checkbox box not found");
    // The pointer may rest on the card from an earlier story.
    await userEvent.unhover(target);
    await waitFor(() => expect(getComputedStyle(preview).opacity).toBe("0"));
    const before = getComputedStyle(visual).borderColor;
    // Hover again until React Aria reports it; the pointer may come from
    // the story before.
    await waitFor(async () => {
      await userEvent.hover(target);
      await expect(getComputedStyle(visual).borderColor).not.toBe(before);
    });
    await waitFor(() =>
      expect(Number(getComputedStyle(preview).opacity)).toBeGreaterThan(0.5),
    );
  },
  parameters: { screenshot: false },
};

/**
 * Keys typed inside the date popover belong to the popover, not to the
 * card. Escape closes it and returns the focus to the card.
 */
export const KeyboardInPopover: Story = {
  args: { datePopover: DatePopover.args?.datePopover },
  render: DatePopover.render,
  play: async ({ args, canvasElement }) => {
    const start = counter(args.onStart);
    const today = counter(args.onPlanToday);
    await userEvent.tab();
    await userEvent.keyboard("d");
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());
    await userEvent.keyboard("s");
    await userEvent.keyboard("h");
    await expect(start()).toBe(0);
    await expect(today()).toBe(0);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    // The focus goes back to where the popover was opened from: the card.
    await waitFor(() =>
      expect(within(canvasElement).getByRole("group")).toHaveFocus(),
    );
  },
  parameters: { screenshot: false },
};

/** Escape closes a popover opened from the chip; the chip gets the focus. */
export const DatePopoverEscape: Story = {
  args: DatePopover.args,
  render: DatePopover.render,
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button", {
      name: "Datum: Fr 10.10.",
    });
    await userEvent.click(chip);
    await within(document.body).findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    await waitFor(() => expect(chip).toHaveFocus());
  },
  parameters: { screenshot: false },
};
