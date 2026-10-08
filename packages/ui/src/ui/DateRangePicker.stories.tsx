import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { DateRangePicker } from "./DateRangePicker";

const week = { start: parseDate("2025-03-10"), end: parseDate("2025-03-16") };

const meta = {
  title: "DateRangePicker",
  component: DateRangePicker,
  args: { label: "Zeitraum", onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="de-DE">
        <div className="min-h-[420px]">
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openCalendar(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: /Kalender öffnen/ }),
  );
  return within(await within(document.body).findByRole("dialog"));
}

/** Presets beside the calendar, a fixed week and its number of days. */
export const Open: Story = {
  args: { defaultValue: week },
  play: async ({ canvasElement }) => {
    const dialog = await openCalendar(canvasElement);
    await expect(dialog.getByText("7 Tage")).toBeInTheDocument();
    await expect(
      dialog.getByRole("button", { name: "Letzte 30 Tage" }),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {};

export const Filled: Story = { args: { defaultValue: week } };

export const Invalid: Story = {
  args: {
    defaultValue: week,
    isInvalid: true,
    errorMessage: "Der Zeitraum ist zu lang.",
  },
};

export const Disabled: Story = {
  args: { defaultValue: week, isDisabled: true },
};

/** On narrow screens the presets are a row of chips above the calendar. */
export const Chips: Story = {
  args: { defaultValue: week, presetLayout: "chips" },
  decorators: [
    (Story) => (
      <div className="w-[352px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await openCalendar(canvasElement);
  },
};

/** ‹ › move a week by a week and a whole month by a month. */
export const Stepper: Story = {
  args: { defaultValue: week },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Nächster Zeitraum" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: parseDate("2025-03-17"),
      end: parseDate("2025-03-23"),
    });
    const dialog = await openCalendar(canvasElement);
    await userEvent.click(
      dialog.getByRole("button", { name: /^Dieser Monat/ }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Vorheriger Zeitraum" }),
    );
    const now = today(getLocalTimeZone());
    const lastMonth = now.subtract({ months: 1 }).set({ day: 1 });
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: lastMonth,
      end: lastMonth.add({ months: 1 }).subtract({ days: 1 }),
    });
  },
  parameters: { screenshot: false },
};

/**
 * `Alt+↓` opens, Enter sets start and end, Escape closes and returns
 * focus to the field. The × removes the range in place.
 */
export const Keyboard: Story = {
  args: { defaultValue: week },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getAllByRole("spinbutton")[0];
    await userEvent.tab();
    await expect(start).toHaveFocus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    const dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: /10\. März/ })).toHaveFocus(),
    );
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      dialog.getByRole("button", { name: /17\. März/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    // A real mouse resting over the grid can move the focus while a range
    // is open, so the end is read from the focused day.
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    const endDay = Number(document.activeElement?.textContent);
    await expect(
      await dialog.findByText(`${String(endDay - 16)} Tage`),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: parseDate("2025-03-17"),
      end: parseDate("2025-03-17").set({ day: endDay }),
    });
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );

    // Focus returns to the field once the popover has closed.
    await waitFor(() => expect(start).toHaveFocus());
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await within(document.body).findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    await waitFor(() => expect(start).toHaveFocus());

    await userEvent.click(
      canvas.getByRole("button", { name: "Zeitraum entfernen" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
    await waitFor(() =>
      expect(canvas.getAllByRole("spinbutton")[0]).toHaveFocus(),
    );
  },
  parameters: { screenshot: false },
};
