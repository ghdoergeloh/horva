import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import type { ChartProject, HoursPerDayProps } from "./HoursPerDay";
import type { DayEntry } from "./HoursPerDay.data";
import { Button } from "./Button";
import { HoursPerDay } from "./HoursPerDay";

const projects: ChartProject[] = [
  { id: 1, name: "Kranich", color: "project-7" },
  { id: 2, name: "Intern", color: "project-1" },
  { id: 3, name: "Nordlicht", color: "project-2" },
  { id: 4, name: "Brückner GmbH", color: "project-6" },
  { id: 5, name: "KI Taskforce", color: "project-8" },
];

const week: DayEntry[] = [
  {
    date: "2026-10-05",
    label: "Mo",
    fullLabel: "Mo 5.10.",
    minutes: [
      { projectId: 1, minutes: 445 },
      { projectId: 2, minutes: 30 },
    ],
  },
  {
    date: "2026-10-06",
    label: "Di",
    fullLabel: "Di 6.10.",
    minutes: [
      { projectId: 2, minutes: 331 },
      { projectId: 4, minutes: 144 },
    ],
  },
  {
    date: "2026-10-07",
    label: "Mi",
    fullLabel: "Mi 7.10.",
    minutes: [
      { projectId: 3, minutes: 328 },
      { projectId: 5, minutes: 112 },
      { projectId: 2, minutes: 30 },
    ],
  },
  {
    date: "2026-10-08",
    label: "Do",
    fullLabel: "Do 8.10.",
    minutes: [{ projectId: 1, minutes: 95 }],
  },
  { date: "2026-10-09", label: "Fr", fullLabel: "Fr 9.10.", minutes: [] },
  { date: "2026-10-10", label: "Sa", fullLabel: "Sa 10.10.", minutes: [] },
  { date: "2026-10-11", label: "So", fullLabel: "So 11.10.", minutes: [] },
];

/** October 2026 with made-up hours on work days. */
const month: DayEntry[] = Array.from({ length: 31 }, (_, i) => {
  const date = `2026-10-${String(i + 1).padStart(2, "0")}`;
  const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const work = weekday < 5;
  return {
    date,
    label: `${String(i + 1)}.`,
    fullLabel: `${String(i + 1)}.10.`,
    minutes: work
      ? [
          { projectId: 1 + (i % 3), minutes: 200 + ((i * 37) % 160) },
          { projectId: 4 + (i % 2), minutes: 60 + ((i * 53) % 150) },
        ]
      : [],
  };
});

const meta = {
  title: "HoursPerDay",
  component: HoursPerDay,
  args: { projects, days: week, targetMinutes: 480 },
  render: (args) => (
    <div className="max-w-160">
      <HoursPerDay {...args} />
    </div>
  ),
} satisfies Meta<typeof HoursPerDay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One week with a target of 8 hours; empty days keep their label. */
export const Week: Story = {};

/** From 15 days on: no sums above the columns, lines between weeks. */
export const Month: Story = {
  args: { days: month },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("7:55")).not.toBeInTheDocument();
    await expect(canvas.getByText("5.")).toBeInTheDocument();
    await expect(canvas.queryByText("6.")).not.toBeInTheDocument();
  },
};

/** No time at all: the axis and the days stay, with a short note. */
export const Empty: Story = {
  args: {
    days: week.map((day) => ({ ...day, minutes: [] })),
  },
};

/** A sum just below the target sits above the line, not across it. */
export const NearTarget: Story = {
  args: {
    days: [
      {
        date: "2026-10-05",
        label: "Mo",
        minutes: [{ projectId: 1, minutes: 470 }],
      },
      {
        date: "2026-10-06",
        label: "Di",
        minutes: [{ projectId: 2, minutes: 200 }],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    // The table repeats the sum, so look in the chart only.
    const chart = canvasElement.querySelector("svg") as SVGSVGElement;
    const label = within(chart as unknown as HTMLElement).getByText(
      "7:50",
    ) as unknown as SVGTextElement;
    const line = canvasElement.querySelector("line[stroke-dasharray='4 4']");
    const lineY = Number(line?.getAttribute("y1"));
    const box = label.getBBox();
    const crosses = lineY > box.y && lineY < box.y + box.height;
    await expect(crosses).toBe(false);
  },
};

/** Without a target there is no dashed line. */
export const NoTarget: Story = {
  args: { targetMinutes: undefined },
};

/** A long day raises the axis. */
export const LongDay: Story = {
  args: {
    days: [
      ...week.slice(0, 3),
      {
        date: "2026-10-08",
        label: "Do",
        minutes: [
          { projectId: 1, minutes: 520 },
          { projectId: 3, minutes: 190 },
        ],
      },
    ],
  },
};

/** At 400 px the columns get narrower; labels stay readable. */
export const Narrow: Story = {
  render: (args) => (
    <div className="w-100">
      <HoursPerDay {...args} />
    </div>
  ),
};

/** "Tabelle anzeigen" shows the values as a table. */
export const Table: Story = {
  args: { days: week.slice(0, 2) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Tabelle anzeigen" });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAccessibleName("Tabelle ausblenden");
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    await expect(
      within(table).getByRole("rowheader", { name: "Mo 5.10." }),
    ).toBeInTheDocument();
  },
};

/** Hover on a legend entry dims the other projects. */
export const HoverLegend: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const legend = within(canvas.getByRole("list"));
    await userEvent.hover(legend.getByText("Intern"));
    const intern = canvas.getByRole("img", {
      name: "Intern, Mo 5.10.: 0:30 h",
    });
    const kranich = canvas.getByRole("img", {
      name: "Kranich, Mo 5.10.: 7:25 h",
    });
    await expect(intern).not.toHaveClass("opacity-35");
    await expect(kranich).toHaveClass("opacity-35");
  },
};

/**
 * Tab focuses the first segment; Up and Down move within a column, Left
 * and Right between days, keeping the project where it can.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const segment = (name: string) => canvas.getByRole("img", { name });
    await userEvent.tab();
    await expect(segment("Kranich, Mo 5.10.: 7:25 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(segment("Intern, Mo 5.10.: 0:30 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(segment("Intern, Di 6.10.: 5:31 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(segment("Intern, Mi 7.10.: 0:30 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(segment("Nordlicht, Mi 7.10.: 5:28 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(segment("Intern, Mi 7.10.: 0:30 h")).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(segment("Kranich, Do 8.10.: 1:35 h")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(segment("Kranich, Do 8.10.: 1:35 h")).toHaveFocus();
    await expect(segment("Intern, Mo 5.10.: 0:30 h")).toHaveClass("opacity-35");
  },
  parameters: { screenshot: false },
};

/** The table button is the next tab stop after the chart. */
export const KeyboardTable: Story = {
  args: { days: week.slice(0, 2) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.tab();
    const toggle = canvas.getByRole("button", { name: "Tabelle anzeigen" });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("table")).toBeVisible();
  },
  parameters: { screenshot: false },
};

/** Shows less data after a press, as when the period changes. */
function Shrinking(args: HoursPerDayProps) {
  const [few, setFew] = useState(false);
  return (
    <div className="flex max-w-160 flex-col items-start gap-3">
      <Button variant="secondary" size="sm" onPress={() => setFew(true)}>
        Weniger Daten
      </Button>
      <HoursPerDay {...args} days={few ? args.days.slice(0, 1) : args.days} />
    </div>
  );
}

/** With less data the chart stays reachable with Tab. */
export const KeyboardFewerData: Story = {
  render: (args) => <Shrinking {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard("{End}");
    await userEvent.tab({ shift: true });
    await expect(
      canvas.getByRole("button", { name: "Weniger Daten" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await expect(document.activeElement).toHaveAttribute("role", "img");
  },
  parameters: { screenshot: false },
};
