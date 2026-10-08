import { composeStory } from "@storybook/react-vite";
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import meta, { Open } from "./DateRangePicker.stories";

afterEach(async () => {
  cleanup();
  document.body.replaceChildren();
  await page.viewport(800, 600);
});

/**
 * At 400 px the default layout puts the presets as one row of chips above
 * the calendar, and ‹ › stay beside the field.
 */
it("shows the presets as chips above the calendar at 400 px", async () => {
  await page.viewport(400, 800);
  const Story = composeStory(Open, meta);
  const { container } = render(<Story />);
  const canvas = within(container);
  await userEvent.click(
    canvas.getByRole("button", { name: /Kalender öffnen/ }),
  );
  const dialog = within(await within(document.body).findByRole("dialog"));

  const grid = dialog.getByRole("grid").getBoundingClientRect();
  const chips = ["Heute", "Gestern", "Diese Woche"].map((name) =>
    dialog.getByRole("button", { name }).getBoundingClientRect(),
  );
  for (const chip of chips) {
    expect(chip.bottom).toBeLessThanOrEqual(grid.top);
    expect(chip.top).toBe(chips[0]?.top);
  }

  const field = canvas.getByRole("group").getBoundingClientRect();
  const next = canvas
    .getByRole("button", { name: "Nächster Zeitraum" })
    .getBoundingClientRect();
  expect(next.left).toBeGreaterThanOrEqual(field.right);
  expect(next.top).toBeGreaterThanOrEqual(field.top);
  expect(next.bottom).toBeLessThanOrEqual(field.bottom);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(400);
});
