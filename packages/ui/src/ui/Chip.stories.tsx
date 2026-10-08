import type { Meta, StoryObj } from "@storybook/react-vite";

import { Chip, Kbd, LiveBadge, ProjectDot } from "./Chip";

const meta = {
  title: "Chip",
  component: Chip,
  args: { children: "Kundenprojekte", color: "project-1" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Project chips, a label chip, the project dots, a key and "running". */
export const Overview: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip color="project-1">Kundenprojekte</Chip>
        <Chip color="project-3">Intern</Chip>
        <Chip color={null}>Ohne Projekt</Chip>
        <Chip color="#8459c3">Eigene Farbe</Chip>
        <Chip>Meeting</Chip>
        <Chip
          color="project-7"
          title="Ein sehr langer Projektname, der gekürzt wird"
        >
          Ein sehr langer Projektname, der gekürzt wird
        </Chip>
      </div>
      <div className="bg-card flex flex-wrap gap-2 p-3">
        {Array.from({ length: 18 }, (_, i) => (
          <ProjectDot key={i} color={`project-${i + 1}`} />
        ))}
        <ProjectDot color="project-none" />
        <ProjectDot color="project-deleted" />
      </div>
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span>
          <Kbd>Strg</Kbd> <Kbd>Enter</Kbd> neu anlegen
        </span>
        <LiveBadge />
      </div>
    </div>
  ),
};

export const Project: Story = {};

export const Label: Story = { args: { color: undefined, children: "Meeting" } };

export const NoProject: Story = {
  args: { color: null, children: "Ohne Projekt" },
};

/** A long name is cut off; the tooltip shows the full name. */
export const LongName: Story = {
  args: {
    children: "Ein sehr langer Projektname, der gekürzt wird",
    title: "Ein sehr langer Projektname, der gekürzt wird",
  },
};

export const Running: Story = { render: () => <LiveBadge /> };
