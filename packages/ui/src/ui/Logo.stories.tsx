import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { HorvaMark, HorvaWordmark, Loader } from "./Logo";

const meta = {
  title: "Logo",
  component: HorvaMark,
} satisfies Meta<typeof HorvaMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The mark in its sizes and the word mark. */
export const Overview: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <HorvaMark size={16} label="Horva" />
        <HorvaMark size={24} label="Horva" />
        <HorvaMark size={32} label="Horva" />
        <HorvaMark size={64} label="Horva" />
      </div>
      <HorvaWordmark size={40} label="Horva" />
    </div>
  ),
};

export const Mark: Story = { args: { size: 48, label: "Horva" } };

export const Wordmark: Story = {
  render: () => <HorvaWordmark size={32} label="Horva" />,
};

/** The loader in a list, in a pending button, and for a whole page. */
export const Loading: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Loader size={24} />
      <Button isPending>Speichern</Button>
      <Loader size={64} />
    </div>
  ),
  // The hands turn, so a still image would differ from run to run.
  parameters: { screenshot: false },
};

export const PageLoader: Story = {
  render: () => <Loader size={64} />,
  parameters: { screenshot: false },
};
