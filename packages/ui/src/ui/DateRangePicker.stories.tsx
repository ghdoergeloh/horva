import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  toCalendarDateTime,
  today,
} from "@internationalized/date";
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
    // React Aria moves to the next day after the start is set by keyboard,
    // to show that a range is being picked.
    await expect(
      dialog.getByRole("button", { name: /18\. März/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      dialog.getByRole("button", { name: /19\. März/ }),
    ).toHaveFocus();
    await expect(dialog.getByText("3 Tage")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: parseDate("2025-03-17"),
      end: parseDate("2025-03-19"),
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

/** Without the × and its divider. */
export const NotClearable: Story = {
  args: { defaultValue: week, isClearable: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("button", {
        name: "Zeitraum entfernen",
      }),
    ).toBeNull();
    await expect(canvasElement.querySelector("[data-divider]")).toBeNull();
  },
};

/**
 * Days outside `minValue` and `maxValue` are locked; presets and ‹ › that
 * would leave them are disabled.
 */
export const Bounds: Story = {
  args: {
    defaultValue: week,
    minValue: parseDate("2025-03-05"),
    maxValue: parseDate("2025-03-25"),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("button", { name: "Nächster Zeitraum" });
    await userEvent.click(next);
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: parseDate("2025-03-17"),
      end: parseDate("2025-03-23"),
    });
    // 24 to 30 March would pass the maximum.
    await expect(next).toBeDisabled();
    const dialog = await openCalendar(canvasElement);
    await expect(
      dialog.getByRole("button", { name: /26\. März/ }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(dialog.getByRole("button", { name: "Heute" })).toBeDisabled();
  },
  parameters: { screenshot: false },
};

/** With today after `maxValue`, Heute is disabled and Gestern is not. */
export const MaxBeforeToday: Story = {
  args: { maxValue: today(getLocalTimeZone()).subtract({ days: 1 }) },
  play: async ({ canvasElement }) => {
    const dialog = await openCalendar(canvasElement);
    await expect(dialog.getByRole("button", { name: "Heute" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Gestern" })).toBeEnabled();
  },
  parameters: { screenshot: false },
};

/** A preset on a range with times keeps the times of the value. */
export const WithTime: Story = {
  args: {
    defaultValue: {
      start: parseDateTime("2025-03-10T08:00"),
      end: parseDateTime("2025-03-16T17:00"),
    },
  },
  play: async ({ args, canvasElement }) => {
    const dialog = await openCalendar(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "Gestern" }));
    const yesterday = toCalendarDateTime(
      today(getLocalTimeZone()).subtract({ days: 1 }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      start: yesterday.set({ hour: 8 }),
      end: yesterday.set({ hour: 17 }),
    });
  },
  parameters: { screenshot: false },
};

/** Preset texts 30 % longer still fit and stay readable. */
export const LongLabels: Story = {
  args: {
    defaultValue: week,
    presets: [
      { id: "a", label: "Nur der heutige Tag", range: week },
      { id: "b", label: "Die laufende Kalenderwoche", range: week },
      { id: "c", label: "Die letzten dreißig Tage", range: week },
    ],
  },
  play: async ({ canvasElement }) => {
    const dialog = await openCalendar(canvasElement);
    for (const button of dialog.getAllByRole("button", { name: /^(Nur|Die)/ }))
      await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
  },
  parameters: { screenshot: false },
};
