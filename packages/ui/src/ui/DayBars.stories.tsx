import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  clearAllMocks,
  expect,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";

import type { DayBarsDay } from "./DayBars";
import { DayBars } from "./DayBars";
import {
  at,
  daySlots,
  mergePeriods,
  now,
  week,
  weekDays,
} from "./DayBarsFixtures";

const meta = {
  title: "DayBars",
  component: DayBars,
  args: { days: weekDays(week), now, onSlotPress: fn() },
  render: (args) => (
    <div className="max-w-190">
      <DayBars {...args} />
    </div>
  ),
} satisfies Meta<typeof DayBars>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

/** The scale labels as the user sees them. */
function scaleLabels(canvas: HTMLElement) {
  return [...canvas.querySelectorAll<HTMLElement>("[aria-hidden] > span")]
    .filter((span) => /^\d\d:00$/.test(span.textContent))
    .filter((span) => span.checkVisibility());
}

/** Fails when a block of the canvas lies outside its bar. */
async function expectBlocksInsideBars(canvas: HTMLElement) {
  const tracks = canvas.querySelectorAll<HTMLElement>("[role=group]");
  for (const track of tracks) {
    const bar = track.getBoundingClientRect();
    for (const block of track.querySelectorAll("button")) {
      const box = block.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(bar.left - 0.5);
      await expect(box.right).toBeLessThanOrEqual(bar.right + 0.5);
    }
  }
}

/**
 * A normal week: Thursday is today, its last slot runs. The scale goes
 * from the earliest start to the latest end of the week.
 */
export const Week: Story = {
  play: async ({ canvasElement }) => {
    const labels = scaleLabels(canvasElement).map((span) => span.textContent);
    await expect(labels[0]).toBe("09:00");
    await expect(labels.at(-1)).toBe("19:00");
    await expect(
      within(canvasElement).getByRole("button", {
        name: "Werkzeuge testen, Leuchtturm, 10:05 bis jetzt",
      }),
    ).toHaveAttribute("data-running");
    await expectBlocksInsideBars(canvasElement);
  },
};

/** A week without slots shows the scale from 8 to 18. */
export const Empty: Story = {
  args: { days: weekDays({}) },
  play: async ({ canvasElement }) => {
    const labels = scaleLabels(canvasElement).map((span) => span.textContent);
    await expect(labels[0]).toBe("08:00");
    await expect(labels.at(-1)).toBe("18:00");
  },
};

/**
 * The running slot goes on past the last end of the week: the scale grows
 * with it, the bar stays inside its track (#75).
 */
export const RunningPastLastEnd: Story = {
  args: {
    days: weekDays({ ...week, 8: daySlots(8, [["09:10", null, 41]]) }),
    now: at(8, "19:10"),
  },
  play: async ({ canvasElement }) => {
    const labels = scaleLabels(canvasElement).map((span) => span.textContent);
    await expect(labels.at(-1)).toBe("20:00");
    await expectBlocksInsideBars(canvasElement);
  },
};

/** The first slot of a new week is still running (#75). */
export const OnlyRunning: Story = {
  args: { days: weekDays({ 8: daySlots(8, [["09:20", null, 21]]) }) },
  play: async ({ canvasElement }) => {
    const labels = scaleLabels(canvasElement).map((span) => span.textContent);
    await expect(labels[0]).toBe("09:00");
    await expect(labels.at(-1)).toBe("12:00");
    await expectBlocksInsideBars(canvasElement);
  },
};

const periodDays: DayBarsDay[] = weekDays(week).map((day) => ({
  ...day,
  blocks: mergePeriods(week[day.date.getDate()] ?? []).map((period, i) => ({
    id: i,
    start: period.start,
    end: period.end,
    title: "Arbeitszeit",
  })),
}));

/** The view "Arbeitszeiten": merged periods in `primary`. */
export const WorkPeriods: Story = {
  args: { days: periodDays, variant: "periods" },
};

/** A day opens below its bar; the content comes from `renderDay`. */
export const OpenDay: Story = {
  args: {
    defaultExpandedDays: ["2026-10-08"],
    renderDay: (day) => (
      <p className="text-muted-foreground text-small">
        Inhalt für {day.date.getDate()}. Oktober
      </p>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Do., 8." }),
    ).toHaveAttribute("aria-expanded", "true");
  },
};

/** On a phone: every second hour, the total below the day name. */
export const Narrow: Story = {
  render: (args) => (
    <div className="w-100">
      <DayBars {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const labels = scaleLabels(canvasElement).map((span) => span.textContent);
    await expect(labels).toEqual([
      "09:00",
      "11:00",
      "13:00",
      "15:00",
      "17:00",
      "19:00",
    ]);
    await expectBlocksInsideBars(canvasElement);
  },
};

/** The hour scale lines up with the bars to the pixel (#58). */
export const ScaleAligned: Story = {
  play: async ({ canvasElement }) => {
    const scale = scaleLabels(canvasElement)[0]?.parentElement;
    const track = canvasElement.querySelector("[role=group]");
    if (!scale || !track) throw new Error("scale or bar missing");
    const a = scale.getBoundingClientRect();
    const b = track.getBoundingClientRect();
    await expect(a.left).toBe(b.left);
    await expect(a.width).toBe(b.width);
  },
  parameters: { screenshot: false },
};

/**
 * Tab reaches the first block of a day and shows its tooltip; the arrow
 * keys move between the blocks of the day, Enter reports the block.
 */
export const KeyboardBlocks: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    const monday = canvas.getByRole("group", { name: "Mo., 5." });
    await userEvent.tab();
    const first = within(monday).getByRole("button", {
      name: "Post lesen, Intern, 09:05 bis 09:12",
    });
    await expect(first).toHaveFocus();
    const tip = await body().findByRole("tooltip");
    await expect(tip).toHaveTextContent("Post lesen");
    await expect(tip).toHaveTextContent("09:05–09:12 · 0:07 h");
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      within(monday).getByRole("button", { name: /^Adapter anbinden.*09:12/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{End}");
    const last = within(monday).getByRole("button", { name: /^Tag planen/ });
    await expect(last).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSlotPress).toHaveBeenCalledTimes(1);
    await expect(args.onSlotPress).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Tag planen" }),
      expect.objectContaining({ id: "2026-10-05" }),
    );
    // Only one block per day is in the tab order: Tab leaves the day.
    await userEvent.tab();
    await expect(
      within(canvas.getByRole("group", { name: "Di., 6." })).getAllByRole(
        "button",
      )[0],
    ).toHaveFocus();
  },
  parameters: { screenshot: false },
};

/** Hovering a block shows the same tooltip. */
export const HoverBlock: Story = {
  play: async ({ canvasElement }) => {
    // React Aria shows tooltips on hover only after pointer use.
    await userEvent.click(document.body);
    await userEvent.hover(
      within(canvasElement).getByRole("button", {
        name: "Werkzeuge testen, Leuchtturm, 10:05 bis jetzt",
      }),
    );
    const tip = await body().findByRole("tooltip", {}, { timeout: 3000 });
    await expect(tip).toHaveTextContent("Leuchtturm");
    await expect(tip).toHaveTextContent("10:05–jetzt · 1:37 h");
  },
  parameters: { screenshot: false },
};

/** The day name opens and closes the day with Enter. */
export const KeyboardOpenDay: Story = {
  args: {
    renderDay: (day) => <p>Inhalt für {day.date.getDate()}. Oktober</p>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const day = canvas.getByRole("button", { name: "Di., 6." });
    day.focus();
    await userEvent.keyboard("{Enter}");
    await expect(day).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(canvas.getByText("Inhalt für 6. Oktober")).toBeVisible(),
    );
    await userEvent.keyboard("{Enter}");
    await expect(day).toHaveAttribute("aria-expanded", "false");
  },
  parameters: { screenshot: false },
};
