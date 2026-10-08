import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Key } from "react-aria-components";
import { useState } from "react";
import {
  clearAllMocks,
  expect,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";

import type { SampleSlot } from "./DayBarsFixtures";
import type {
  SlotTableEditing,
  SlotTableProps,
  SlotTableSlot,
} from "./SlotTable";
import { at, now, projects, taskOf, tasks, week } from "./DayBarsFixtures";
import { SlotTable } from "./SlotTable";

/** A sample slot as a row of the table. */
function toRow(slot: SampleSlot): SlotTableSlot {
  const { task, project } = taskOf(slot.taskId);
  return {
    id: slot.id,
    start: slot.start,
    end: slot.end,
    taskId: slot.taskId,
    task: task?.name ?? null,
    project: project && { name: project.name, color: project.color },
  };
}

const wednesday = (week[7] ?? []).map(toRow);
const thursday = (week[8] ?? []).map(toRow);
const [, second] = wednesday;
const lunch = { start: at(7, "12:02"), end: at(7, "13:05") };

/** Holds the open row and applies saved drafts, as the app would. */
function Harness(props: SlotTableProps) {
  const [slots, setSlots] = useState(props.slots);
  const [editing, setEditing] = useState(props.editing);
  return (
    <SlotTable
      {...props}
      slots={slots}
      editing={editing}
      onEdit={(id: Key) => {
        props.onEdit?.(id);
        setEditing({ kind: "slot", id });
      }}
      onAddSlot={(gap) => {
        props.onAddSlot?.(gap);
        setEditing({ kind: "new", ...gap });
      }}
      onCancel={() => {
        props.onCancel?.();
        setEditing(null);
      }}
      onSave={(draft, target: SlotTableEditing) => {
        void props.onSave?.(draft, target);
        const day = slots[0]?.start ?? lunch.start;
        const time = (t: { hour: number; minute: number } | null) =>
          t &&
          new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            t.hour,
            t.minute,
          );
        const task = tasks.find((t) => t.id === draft.taskId);
        const project = projects.find((p) => p.id === task?.projectId);
        const row: SlotTableSlot = {
          id: target.kind === "slot" ? target.id : 1000,
          start: time(draft.start) ?? lunch.start,
          end: time(draft.end),
          taskId: draft.taskId,
          task: task?.name ?? null,
          project: project && { name: project.name, color: project.color },
        };
        setSlots((all) => [...all.filter((s) => s.id !== row.id), row]);
        setEditing(null);
      }}
    />
  );
}

const meta = {
  title: "SlotTable",
  component: SlotTable,
  args: {
    slots: wednesday,
    now,
    projects,
    tasks,
    onEdit: fn(),
    onAddSlot: fn(),
    onCancel: fn(),
    onSave: fn(),
  },
  render: (args) => (
    <div className="bg-card max-w-190 rounded-lg px-3 py-2">
      <Harness {...args} />
    </div>
  ),
} satisfies Meta<typeof SlotTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

/** The hour, minute pair of the time field with this name. */
function segments(canvas: HTMLElement, name: string) {
  const [hour, minute] = within(
    within(canvas).getByRole("group", { name }),
  ).getAllByRole("spinbutton");
  if (!hour || !minute) throw new Error(`time field ${name} missing`);
  return { hour, minute };
}

/** Types a new end time into the open row. */
async function typeEnd(canvas: HTMLElement, hour: string, minute: string) {
  const end = segments(canvas, "Ende");
  await userEvent.click(end.hour);
  await userEvent.keyboard(hour);
  await userEvent.click(end.minute);
  await userEvent.keyboard(minute);
}

/**
 * A slot in edit mode: time fields, the task picker, Save and Cancel, and
 * the note on the neighbour slot that moves.
 */
export const Editing: Story = {
  args: {
    editing: { kind: "slot", id: second?.id ?? 0 },
    editNote:
      "Der folgende Slot „Werkzeuge testen“ beginnt dann um 10:20 statt 10:16.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Speichern" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Abbrechen" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(segments(canvasElement, "Start").hour).toHaveFocus(),
    );
  },
};

/** A day with a gap: the gap is a quiet row with "Slot eintragen". */
export const Day: Story = {};

/** The running slot: until "jetzt", the duration in orange text. */
export const Running: Story = {
  args: { slots: thursday },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("jetzt")).toBeVisible();
    await expect(within(canvasElement).getByText("1:37")).toBeVisible();
  },
};

/** A day without slots. */
export const Empty: Story = { args: { slots: [] } };

/** A new slot in the gap, with the gap times preset. */
export const NewSlot: Story = {
  args: { editing: { kind: "new", ...lunch } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Lücke")).toBe(null);
    await expect(segments(canvasElement, "Start").hour).toHaveTextContent("12");
    await expect(
      canvas.getByRole("button", { name: "Speichern" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Abbrechen" }),
    ).toBeVisible();
  },
};

/** On a phone: the project goes below the task, the open row wraps. */
export const Narrow: Story = {
  args: {
    slots: wednesday.slice(0, 5),
    editing: { kind: "slot", id: second?.id ?? 0 },
  },
  render: (args) => (
    <div className="bg-card w-100 rounded-lg px-1 py-2">
      <Harness {...args} />
    </div>
  ),
};

/** While a row is open, the other rows cannot be opened. */
export const OtherRowsLocked: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const button of canvas.getAllByRole("button", { name: /bearbeiten$/ }))
      await expect(button).toBeDisabled();
    await expect(
      canvas.getByRole("button", {
        name: "Slot von 12:02 bis 13:05 eintragen",
      }),
    ).toBeDisabled();
  },
  parameters: { screenshot: false },
};

/** The edit button opens the row; Save stores the changed end. */
export const EditAndSave: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Slot 09:27–10:16 bearbeiten" }),
    );
    await typeEnd(canvasElement, "10", "20");
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(args.onSave).toHaveBeenCalledWith(
      {
        start: { hour: 9, minute: 27 },
        end: { hour: 10, minute: 20 },
        taskId: 12,
      },
      { kind: "slot", id: second?.id },
    );
    await expect(canvas.getByText("10:20")).toBeVisible();
  },
  parameters: { screenshot: false },
};

/** An end before the start is not saved and says why. */
export const Invalid: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    await typeEnd(canvasElement, "09", "00");
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Das Ende muss nach dem Start liegen.",
    );
    await expect(args.onSave).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** Enter in a time field saves the row. */
export const KeyboardEnterSaves: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await typeEnd(canvasElement, "10", "30");
    await userEvent.keyboard("{Enter}");
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ end: { hour: 10, minute: 30 } }),
      expect.anything(),
    );
  },
  parameters: { screenshot: false },
};

/**
 * Enter on the closed task field saves the row and does not open the task
 * list at the same time (#34).
 */
export const KeyboardEnterOnTaskField: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const trigger = within(canvasElement).getByRole("button", {
      name: /^Aufgabe/,
    });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect(body().queryByRole("dialog")).toBe(null);
  },
  parameters: { screenshot: false },
};

/**
 * Arrow down opens the task list; Enter there picks the task and closes
 * the list without saving. A second Enter saves the new task.
 */
export const KeyboardPickThenSave: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const trigger = within(canvasElement).getByRole("button", {
      name: /^Aufgabe/,
    });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const search = await body().findByRole("textbox", {
      name: "Aufgabe suchen oder neu anlegen …",
    });
    await waitFor(() => expect(search).toHaveFocus());
    await userEvent.keyboard("kick{Enter}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBe(null));
    await expect(args.onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 22 }),
      expect.anything(),
    );
  },
  parameters: { screenshot: false },
};

/** Escape cancels the row without saving. */
export const KeyboardEscapeCancels: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await typeEnd(canvasElement, "11", "00");
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onSave).not.toHaveBeenCalled();
    await expect(
      within(canvasElement).queryByRole("button", { name: "Speichern" }),
    ).toBe(null);
  },
  parameters: { screenshot: false },
};

/** A task picked with the mouse is kept in the open row until Save. */
export const MousePickTask: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^Aufgabe/ }));
    await userEvent.click(
      await body().findByRole("option", { name: /Kick-Off/ }),
    );
    await waitFor(() => expect(body().queryByRole("dialog")).toBe(null));
    await expect(args.onSave).not.toHaveBeenCalled();
    await expect(canvas.queryByRole("status")).toBe(null);
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 22 }),
      expect.anything(),
    );
  },
  parameters: { screenshot: false },
};

/**
 * A click outside keeps the draft of an existing slot and marks it: no
 * silent save, no silent loss (#34).
 */
export const ClickOutsideKeepsDraft: Story = {
  args: { editing: { kind: "slot", id: second?.id ?? 0 } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await typeEnd(canvasElement, "10", "40");
    const [other] = within(canvasElement).getAllByText("Karten zeichnen");
    if (other) await userEvent.click(other);
    await expect(args.onSave).not.toHaveBeenCalled();
    await expect(args.onCancel).not.toHaveBeenCalled();
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "Noch nicht gespeichert",
    );
    await expect(segments(canvasElement, "Ende").minute).toHaveTextContent(
      "40",
    );
  },
  parameters: { screenshot: false },
};

/** The same for a new slot: a click outside does not discard it. */
export const ClickOutsideKeepsNewSlot: Story = {
  args: { editing: { kind: "new", ...lunch } },
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await typeEnd(canvasElement, "12", "45");
    await userEvent.click(document.body);
    await expect(args.onSave).not.toHaveBeenCalled();
    await expect(args.onCancel).not.toHaveBeenCalled();
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "Noch nicht gespeichert",
    );
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Speichern" }),
    );
    await expect(args.onSave).toHaveBeenCalledWith(
      {
        start: { hour: 12, minute: 2 },
        end: { hour: 12, minute: 45 },
        taskId: null,
      },
      { kind: "new", ...lunch },
    );
  },
  parameters: { screenshot: false },
};

/** "Slot eintragen" in a gap opens a new row with the gap times. */
export const AddSlotInGap: Story = {
  play: async ({ canvasElement, args }) => {
    clearAllMocks();
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Slot von 12:02 bis 13:05 eintragen",
      }),
    );
    await expect(args.onAddSlot).toHaveBeenCalledWith(lunch);
    await expect(segments(canvasElement, "Ende").hour).toHaveTextContent("13");
  },
  parameters: { screenshot: false },
};
