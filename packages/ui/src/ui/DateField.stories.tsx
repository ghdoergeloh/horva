import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { DateField } from "./DateField";

const meta = {
  title: "DateField",
  component: DateField,
  args: { label: "Geplant für", onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="de-DE">
        <div className="max-w-60">
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
};

export const Empty: Story = {
  args: { description: "Tippen oder T für heute." },
};

export const Invalid: Story = {
  args: {
    defaultValue: parseDate("2025-03-14"),
    isInvalid: true,
    errorMessage: "Das Datum liegt vor dem Projektstart.",
  },
};

export const Disabled: Story = {
  args: { defaultValue: parseDate("2025-03-14"), isDisabled: true },
};

/**
 * Arrows change a segment, Backspace on an empty segment goes back, `T`
 * sets today and the × removes the date while focus stays in the field.
 */
export const Keyboard: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const [day, month] = canvas.getAllByRole("spinbutton");
    await userEvent.tab();
    await expect(day).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      parseDate("2025-03-15"),
    );

    await userEvent.tab();
    await expect(month).toHaveFocus();
    // The first Backspace empties the month, the second goes back.
    await userEvent.keyboard("{Backspace}");
    await expect(month).toHaveFocus();
    await userEvent.keyboard("{Backspace}");
    await expect(day).toHaveFocus();

    await userEvent.keyboard("t");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      today(getLocalTimeZone()),
    );

    await userEvent.click(
      canvas.getByRole("button", { name: "Datum entfernen" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
    await waitFor(() =>
      expect(canvas.getAllByRole("spinbutton")[0]).toHaveFocus(),
    );
    await expect(
      canvas.queryByRole("button", { name: "Datum entfernen" }),
    ).toBeNull();
  },
  parameters: { screenshot: false },
};

/** Without the ×, for fields that must keep a date. */
export const NotClearable: Story = {
  args: { defaultValue: parseDate("2025-03-14"), isClearable: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("button", { name: "Datum entfernen" }),
    ).toBeNull();
  },
};

/** `T` does nothing when today is after the latest allowed day. */
export const MaxBeforeToday: Story = {
  args: {
    // A spy of its own: the one of the meta also counts other stories.
    onChange: fn(),
    maxValue: today(getLocalTimeZone()).subtract({ days: 1 }),
  },
  play: async ({ args, canvasElement }) => {
    const day = within(canvasElement).getAllByRole("spinbutton")[0];
    await userEvent.tab();
    await expect(day).toHaveFocus();
    await userEvent.keyboard("t");
    await expect(args.onChange).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};
