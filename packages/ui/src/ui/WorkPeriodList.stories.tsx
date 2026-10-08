import type { Meta, StoryObj } from "@storybook/react-vite";
import { clearAllMocks, expect, fn, userEvent, within } from "storybook/test";

import type { SampleSlot } from "./DayBarsFixtures";
import type { WorkPeriod } from "./WorkPeriodList";
import { mergePeriods, now, taskOf, week } from "./DayBarsFixtures";
import { WorkPeriodList } from "./WorkPeriodList";

/** The sample slots of a day as merged work periods. */
function periodsOf(slots: SampleSlot[]): WorkPeriod[] {
  return mergePeriods(slots).map((period, i) => {
    const projects = new Map<string, WorkPeriod["projects"][number]>();
    for (const slot of period.slots) {
      const { project } = taskOf(slot.taskId);
      if (project) projects.set(project.name, project);
    }
    return {
      id: i,
      start: period.start,
      end: period.end,
      slotCount: period.slots.length,
      projects: [...projects.values()],
    };
  });
}

const meta = {
  title: "WorkPeriodList",
  component: WorkPeriodList,
  args: { periods: periodsOf(week[7] ?? []), now, onCopy: fn() },
  render: (args) => (
    <div className="bg-card max-w-190 rounded-lg px-3 py-2">
      <WorkPeriodList {...args} />
    </div>
  ),
} satisfies Meta<typeof WorkPeriodList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A day with two periods and the break between them. */
export const Day: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pause")).toBeVisible();
    await expect(canvas.getByText("Pause 1:03")).toBeVisible();
    await expect(canvas.getByText("7:49")).toBeVisible();
  },
};

/** Today: the last period still runs. */
export const Running: Story = {
  args: { periods: periodsOf(week[8] ?? []) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("jetzt")).toBeVisible();
    await expect(within(canvasElement).getAllByText("2:32")).toHaveLength(2);
  },
};

/** A day without work periods. */
export const Empty: Story = { args: { periods: [] } };

/** Three periods with two breaks. */
export const ManyBreaks: Story = {
  args: { periods: periodsOf(week[6] ?? []) },
};

/** On a phone the content wraps. */
export const Narrow: Story = {
  render: (args) => (
    <div className="bg-card w-100 rounded-lg px-1 py-2">
      <WorkPeriodList {...args} />
    </div>
  ),
};

/** Copying a period hands its times to `onCopy` and says so. */
export const CopyPeriod: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Zeitraum 09:20–12:02 kopieren" }),
    );
    await expect(args.onCopy).toHaveBeenCalledWith("09:20–12:02");
    await expect(canvas.getByRole("status")).toHaveTextContent("Kopiert");
  },
  parameters: { screenshot: false },
};

/** "Tag kopieren" copies all periods of the day, with the keyboard too. */
export const KeyboardCopyDay: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const button = within(canvasElement).getByRole("button", {
      name: "Tag kopieren",
    });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onCopy).toHaveBeenCalledWith("09:20–12:02, 13:05–18:12");
  },
  parameters: { screenshot: false },
};
