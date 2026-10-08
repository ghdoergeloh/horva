import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import type { StatTile } from "./StatTiles";
import { StatTiles } from "./StatTiles";

const tiles: StatTile[] = [
  { id: "total", label: "Gesamt", minutes: 1412, targetMinutes: 1920 },
  {
    id: "average",
    label: "Ø pro Arbeitstag",
    minutes: 471,
    context: "3 Tage erfasst",
  },
  {
    id: "project",
    label: "Größtes Projekt",
    project: { name: "Kranich", color: "project-7" },
    context: "31 % · 7:17 h",
  },
  {
    id: "without",
    label: "Ohne Aufgabe",
    minutes: 1,
    context: "Lücken: 1:03 h",
  },
];

const meta = {
  title: "StatTiles",
  component: StatTiles,
  args: { tiles },
  render: (args) => (
    <div className="max-w-180">
      <StatTiles {...args} />
    </div>
  ),
} satisfies Meta<typeof StatTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Total with target, average, largest project and time without a task. */
export const Filled: Story = {};

/** At 400 px the tiles drop to two columns. */
export const Narrow: Story = {
  render: (args) => (
    <div className="w-100">
      <StatTiles {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const terms = within(canvasElement).getAllByRole("term");
    const tops = terms.map((term) => term.getBoundingClientRect().top);
    await expect(tops[0]).toBe(tops[1]);
    await expect(tops[2]).toBeGreaterThan(tops[1] ?? 0);
  },
};

/** Above the target the difference gets a plus sign. */
export const AboveTarget: Story = {
  args: {
    tiles: [
      { id: "total", label: "Gesamt", minutes: 2040, targetMinutes: 1920 },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Soll 32:00 · +2:00"),
    ).toBeInTheDocument();
  },
};

/** Nothing recorded yet: zeros and a dash, no colors. */
export const Empty: Story = {
  args: {
    tiles: [
      { id: "total", label: "Gesamt", minutes: 0, targetMinutes: 1920 },
      { id: "average", label: "Ø pro Arbeitstag", value: undefined },
      { id: "without", label: "Ohne Aufgabe", minutes: 0 },
    ],
  },
};

/** Large values and a long project name stay inside their tile. */
export const Limits: Story = {
  args: {
    tiles: [
      { id: "total", label: "Gesamt", minutes: 12_345, targetMinutes: 9600 },
      {
        id: "project",
        label: "Größtes Projekt",
        project: {
          name: "Ein sehr langer Projektname, der gekürzt wird",
          color: "project-2",
        },
        context: "64 % · 131:10 h",
      },
      { id: "count", label: "Aufgaben erledigt", value: "128" },
    ],
  },
};
