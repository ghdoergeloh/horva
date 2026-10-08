import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Select, SelectItem } from "./Select";

const meta = {
  title: "Select",
  component: Select,
  args: {
    label: "Country",
    placeholder: "Choose a country",
    children: [
      <SelectItem key="at" id="at">
        Austria
      </SelectItem>,
      <SelectItem key="de" id="de">
        Germany
      </SelectItem>,
      <SelectItem key="ch" id="ch">
        Switzerland
      </SelectItem>,
    ],
  },
  decorators: [
    (Story) => (
      <div className="min-h-48 max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Selected: Story = { args: { defaultValue: "de" } };

export const Invalid: Story = {
  args: { isInvalid: true, errorMessage: "Choose a country." },
};

export const Disabled: Story = { args: { isDisabled: true } };

/** The open list, as the user sees it after a click. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    // The screenshot shows the list after its enter animation.
    await expect(
      await within(document.body).findByRole("listbox"),
    ).toBeInTheDocument();
  },
};

/**
 * Enter opens the list, arrows move, Enter selects and closes, Escape
 * closes without a change; focus goes back to the trigger.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button");
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const list = await within(document.body).findByRole("listbox");
    await waitFor(() =>
      expect(
        within(list).getByRole("option", { name: "Austria" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveTextContent("Germany");
    await userEvent.keyboard("{Enter}");
    await within(document.body).findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveTextContent("Germany");
  },
  parameters: { screenshot: false },
};
