import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { expect, fn, userEvent, within } from "storybook/test";

import { Calendar } from "./Calendar";
import { RangeCalendar } from "./RangeCalendar";

const meta = {
  title: "Calendar",
  component: Calendar,
  args: { onChange: fn() },
  decorators: [
    (Story) => (
      <I18nProvider locale="de-DE">
        <Story />
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One selected day; weeks start on Monday. */
export const Selected: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
};

export const Empty: Story = {
  args: { defaultFocusedValue: parseDate("2025-03-01") },
};

/** A range: start and end in `primary`, the days between in `accent`. */
export const Range: Story = {
  render: () => (
    <RangeCalendar
      defaultValue={{
        start: parseDate("2025-03-10"),
        end: parseDate("2025-03-16"),
      }}
    />
  ),
};

/** Today has a dot. The month changes with the date, so no screenshot. */
export const Today: Story = {
  args: { defaultValue: today(getLocalTimeZone()).add({ days: 1 }) },
  play: async ({ canvasElement }) => {
    const cell = within(canvasElement)
      .getAllByRole("button")
      .find((el) => el.dataset["today"] !== undefined);
    await expect(cell).toBeDefined();
  },
  parameters: { screenshot: false },
};

export const Disabled: Story = {
  args: { defaultValue: parseDate("2025-03-14"), isDisabled: true },
};

export const Invalid: Story = {
  args: {
    defaultValue: parseDate("2025-03-15"),
    isInvalid: true,
    errorMessage: "Am Wochenende wird nicht geplant.",
  },
};

/** Arrows move by day and week, Page Down by month, Enter picks. */
export const Keyboard: Story = {
  args: { defaultValue: parseDate("2025-03-14") },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    // Weeks start on Monday.
    await expect(canvasElement.querySelector("th")).toHaveTextContent("Mo");
    // Tab passes the month buttons and lands on the selected day.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: /14\. März/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    await expect(
      canvas.getByRole("button", { name: /22\. März/ }),
    ).toHaveFocus();
    await userEvent.keyboard("{PageDown}");
    await expect(canvasElement).toHaveTextContent("April 2025");
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      parseDate("2025-04-22"),
    );
    // Leaves the calendar, so unmounting it does not move focus.
    await userEvent.tab();
    await expect(canvasElement.contains(document.activeElement)).toBe(false);
  },
  parameters: { screenshot: false },
};
