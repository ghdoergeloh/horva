import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tag, TagGroup } from "./TagGroup";

const meta = {
  title: "TagGroup",
  component: TagGroup,
  args: { label: "Labels" },
} satisfies Meta<typeof TagGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gray: Story = {
  render: (args) => (
    <TagGroup {...args}>
      <Tag>Meeting</Tag>
      <Tag>Review</Tag>
    </TagGroup>
  ),
};

/** Each color as text on its own fill, in both themes. */
export const Colors: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(["gray", "green", "yellow", "blue"] as const).map((color) => (
        <TagGroup {...args} key={color} label={color} color={color}>
          <Tag>Meeting</Tag>
          <Tag>Review</Tag>
        </TagGroup>
      ))}
    </div>
  ),
};
