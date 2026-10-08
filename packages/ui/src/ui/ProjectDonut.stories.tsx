import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { ProjectShare } from "./ProjectDonut.data";
import { ProjectDonut } from "./ProjectDonut";

const week: ProjectShare[] = [
  { id: 1, name: "Kranich", color: "project-7", minutes: 437 },
  { id: 2, name: "Intern", color: "project-1", minutes: 390 },
  { id: 3, name: "Nordlicht", color: "project-2", minutes: 328 },
  { id: 4, name: "Brückner GmbH", color: "project-6", minutes: 144 },
  { id: 5, name: "KI Taskforce", color: "project-8", minutes: 112 },
  {
    id: "without",
    name: "ohne Aufgabe",
    color: null,
    minutes: 1,
    isWithoutTask: true,
  },
];

const many: ProjectShare[] = [
  ...week.slice(0, 5),
  { id: 6, name: "Lindenhof", color: "project-3", minutes: 96 },
  { id: 7, name: "Seewerk", color: "project-4", minutes: 80 },
  { id: 8, name: "Polarstern", color: "project-5", minutes: 45 },
  { id: 9, name: "Feldweg", color: "project-9", minutes: 30 },
  { id: 10, name: "Morgentau", color: "project-10", minutes: 12 },
];

const meta = {
  title: "ProjectDonut",
  component: ProjectDonut,
  args: { projects: week },
  render: (args) => (
    <div className="max-w-160">
      <ProjectDonut {...args} />
    </div>
  ),
} satisfies Meta<typeof ProjectDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five projects and the time without a task, largest first. */
export const Filled: Story = {};

/** More than 8 projects: the smallest are grouped into "Weitere". */
export const ManyProjects: Story = {
  args: { projects: many },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const others = canvas.getByRole("button", { name: /Weitere/ });
    await expect(others).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(others);
    await expect(others).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Morgentau")).toBeVisible();
  },
};

/** A single project fills the whole ring. */
export const SingleProject: Story = {
  args: {
    projects: [{ id: 1, name: "Kranich", color: "project-7", minutes: 95 }],
  },
};

/** No time in the period: an empty ring and a short note. */
export const Empty: Story = {
  args: { projects: [] },
};

/** Long names are cut off; the ring and legend wrap at 400 px. */
export const Narrow: Story = {
  args: {
    projects: [
      {
        id: 1,
        name: "Ein sehr langer Projektname, der gekürzt wird",
        color: "project-3",
        minutes: 4100,
      },
      ...week.slice(1),
    ],
  },
  render: (args) => (
    <div className="w-100">
      <ProjectDonut {...args} />
    </div>
  ),
};

/** Hover on a legend row highlights its segment and dims the others. */
export const HoverLegend: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByText("Nordlicht"));
    const segments = canvas.getAllByRole("img");
    await expect(segments[2]).not.toHaveClass("opacity-35");
    await expect(segments[0]).toHaveClass("opacity-35");
  },
};

/**
 * Tab focuses the first segment and shows its tooltip; the arrows move
 * between segments, the legend row follows.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const segments = canvas.getAllByRole("img");
    await userEvent.tab();
    await expect(segments[0]).toHaveFocus();
    await expect(segments[0]).toHaveAccessibleName("Kranich: 7:17 h, 31 %");
    await expect(segments[1]).toHaveClass("opacity-35");
    await userEvent.keyboard("{ArrowRight}");
    await expect(segments[1]).toHaveFocus();
    await expect(segments[1]).toHaveAttribute("tabindex", "0");
    await expect(segments[0]).toHaveAttribute("tabindex", "-1");
    await expect(segments[0]).toHaveClass("opacity-35");
    await userEvent.keyboard("{End}");
    await expect(segments[5]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(segments[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(segments[5]).toHaveFocus();
    const legend = within(canvas.getByRole("list"));
    await expect(legend.getByText("ohne Aufgabe").closest("div")).toHaveClass(
      "bg-accent",
    );
  },
  parameters: { screenshot: false },
};

/** Tab leaves the ring; the "Weitere" row opens with Enter. */
export const KeyboardOthers: Story = {
  args: { projects: many },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.tab();
    const others = canvas.getByRole("button", { name: /Weitere/ });
    await expect(others).toHaveFocus();
    const segment = canvas.getByRole("img", { name: /^Weitere/ });
    await expect(segment).not.toHaveClass("opacity-35");
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(others).toHaveAttribute("aria-expanded", "true"),
    );
  },
  parameters: { screenshot: false },
};
