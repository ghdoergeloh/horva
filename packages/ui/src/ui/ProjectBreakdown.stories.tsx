import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { BreakdownProject } from "./ProjectBreakdown";
import { ProjectBreakdown } from "./ProjectBreakdown";

const projects: BreakdownProject[] = [
  {
    id: 1,
    name: "Kranich",
    color: "project-7",
    minutes: 437,
    tasks: [
      {
        id: 161,
        name: "Schnittstelle: Teilnahmeübersicht aus dem Altsystem für das Portal bereitstellen (Ticket 161)",
        minutes: 320,
      },
      {
        id: 158,
        name: "Unterschiedliches Routing nicht exponierter Routen untersuchen (Ticket 158)",
        minutes: 95,
      },
      { id: 12, name: "Wöchentliches Entwicklertreffen", minutes: 21 },
      {
        id: 148,
        name: "Portal: Adapter je Fähigkeit einstellen (Ticket 148)",
        minutes: 1,
      },
    ],
  },
  {
    id: 2,
    name: "Intern",
    color: "project-1",
    minutes: 390,
    tasks: [
      { id: 21, name: "Nachrichten lesen", minutes: 210 },
      { id: 22, name: "Reisekosten September einreichen", minutes: 180 },
    ],
  },
  {
    id: 3,
    name: "Nordlicht",
    color: "project-2",
    minutes: 328,
    tasks: [{ id: 31, name: "Workshop vorbereiten", minutes: 328 }],
  },
  {
    id: 4,
    name: "Brückner GmbH",
    color: "project-6",
    minutes: 144,
    tasks: [],
  },
  {
    id: 5,
    name: "KI Taskforce",
    color: "project-8",
    minutes: 112,
    tasks: [{ id: 51, name: "Modelle vergleichen", minutes: 112 }],
  },
];

const meta = {
  title: "ProjectBreakdown",
  component: ProjectBreakdown,
  args: { projects, onTransfer: fn() },
  render: (args) => (
    <div className="max-w-190">
      <ProjectBreakdown {...args} />
    </div>
  ),
} satisfies Meta<typeof ProjectBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first project open with its tasks, the others closed. */
export const FirstOpen: Story = {
  args: { defaultExpandedKeys: [1] },
};

/** All rows closed. */
export const Closed: Story = {};

/** An open project without tasks says so. */
export const NoTasks: Story = {
  args: { defaultExpandedKeys: [4] },
};

/** Without `onTransfer` there is no transfer button. */
export const WithoutTransfer: Story = {
  args: { onTransfer: undefined },
};

/** The transfer is running. */
export const TransferPending: Story = {
  args: { isTransferPending: true },
};

/** No time in the period. */
export const Empty: Story = {
  args: { projects: [] },
};

/** At 400 px the share bar is hidden and long titles wrap. */
export const Narrow: Story = {
  args: { defaultExpandedKeys: [1] },
  render: (args) => (
    <div className="w-100">
      <ProjectBreakdown {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const head = within(canvasElement).getByRole("button", { name: /Kranich/ });
    const bar = head.querySelector("[aria-hidden].bg-muted");
    await expect(bar).not.toBeVisible();
  },
};

/** A click opens a row; `aria-expanded` follows. */
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const head = canvas.getByRole("button", { name: /Intern/ });
    await expect(head).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(head);
    await expect(head).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Nachrichten lesen")).toBeVisible();
  },
};

/** Enter and Space open and close a row; the arrows move between rows. */
export const Keyboard: Story = {
  args: { onTransfer: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const head = (name: RegExp) => canvas.getByRole("button", { name });
    await userEvent.tab();
    await expect(head(/Kranich/)).toHaveFocus();
    await expect(head(/Kranich/)).toHaveAttribute("data-focus-visible", "true");
    await userEvent.keyboard("{Enter}");
    await expect(head(/Kranich/)).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard(" ");
    await expect(head(/Kranich/)).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{ArrowDown}");
    await expect(head(/Intern/)).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(head(/KI Taskforce/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(head(/KI Taskforce/)).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(head(/Brückner/)).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(head(/Kranich/)).toHaveFocus();
  },
  parameters: { screenshot: false },
};
