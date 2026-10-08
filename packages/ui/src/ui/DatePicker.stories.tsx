import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  today,
} from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { DatePicker } from "./DatePicker";
import { DateTimePicker } from "./DateTimePicker";

const meta = {
  title: "DatePicker",
  component: DatePicker,
  args: { label: "Geplant für", onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="de-DE">
        <div className="min-h-[440px] max-w-64">
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens the calendar of the field. */
async function openCalendar(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: /Kalender öffnen/ }),
  );
  return within(await within(document.body).findByRole("dialog"));
}

/** The open calendar with a fixed date, so the picture stays the same. */
export const Open: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
  play: async ({ canvasElement }) => {
    const dialog = await openCalendar(canvasElement);
    await expect(dialog.getByRole("grid")).toBeInTheDocument();
    // Weeks start on Monday.
    await expect(
      dialog.getByRole("grid").querySelector("th"),
    ).toHaveTextContent("Mo");
  },
};

export const Empty: Story = {
  args: { description: "Tippen oder im Kalender wählen." },
};

export const Filled: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
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

/** With time, as `DateTimePicker`. */
export const WithTime: Story = {
  render: (args) => (
    <DateTimePicker
      label={args.label}
      onChange={args.onChange}
      defaultValue={parseDateTime("2025-03-14T17:00")}
    />
  ),
};

/**
 * `Alt+↓` opens the calendar on the selected day. Arrows move, Page Down
 * goes to the next month, Enter picks and closes. Escape closes and
 * returns focus to the field.
 */
export const Keyboard: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
  play: async ({ args, canvasElement }) => {
    const day = within(canvasElement).getAllByRole("spinbutton")[0];
    await userEvent.tab();
    await expect(day).toHaveFocus();

    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    const dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: /14\. März/ })).toHaveFocus(),
    );
    await userEvent.keyboard("{ArrowRight}{PageDown}");
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: /15\. April/ })).toHaveFocus(),
    );
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      parseDate("2025-04-15"),
    );
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );

    // Focus returns to the field once the popover has closed.
    await waitFor(() => expect(day).toHaveFocus());
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await within(document.body).findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    await waitFor(() => expect(day).toHaveFocus());
  },
  parameters: { screenshot: false },
};

/** `T` on a segment sets today; the × removes the date in place. */
export const TodayAndClear: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("t");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      today(getLocalTimeZone()),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Datum entfernen" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(canvas.getAllByRole("spinbutton")[0]).toHaveFocus(),
    );
  },
  parameters: { screenshot: false },
};

/** Heute, Morgen and Entfernen below the calendar. */
export const QuickChoices: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
  play: async ({ args, canvasElement }) => {
    let dialog = await openCalendar(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "Morgen" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(
      today(getLocalTimeZone()).add({ days: 1 }),
    );
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    dialog = await openCalendar(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "Entfernen" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
  },
  parameters: { screenshot: false },
};
