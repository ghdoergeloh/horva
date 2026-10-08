import type { Meta, StoryObj } from "@storybook/react-vite";
import { Time } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { expect, fn, userEvent, within } from "storybook/test";

import { TimeField } from "./TimeField";

const meta = {
  title: "TimeField",
  component: TimeField,
  args: { label: "Beginn", onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="de-DE">
        <div className="max-w-40">
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof TimeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = { args: { defaultValue: new Time(17, 0) } };

export const Empty: Story = {};

export const Invalid: Story = {
  args: {
    defaultValue: new Time(9, 30),
    isInvalid: true,
    errorMessage: "Beginn liegt nach dem Ende.",
  },
};

export const Disabled: Story = {
  args: { defaultValue: new Time(17, 0), isDisabled: true },
};

/** Arrows change the hour, typing fills the minutes. */
export const Keyboard: Story = {
  args: { defaultValue: new Time(17, 0) },
  play: async ({ args, canvasElement }) => {
    const [hour, minute] = within(canvasElement).getAllByRole("spinbutton");
    await userEvent.tab();
    await expect(hour).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(args.onChange).toHaveBeenLastCalledWith(new Time(18, 0));
    await userEvent.tab();
    await expect(minute).toHaveFocus();
    await userEvent.keyboard("45");
    await expect(args.onChange).toHaveBeenLastCalledWith(new Time(18, 45));
  },
  parameters: { screenshot: false },
};
