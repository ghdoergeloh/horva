import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  clearAllMocks,
  expect,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";

import type {
  TaskPickerKey,
  TaskPickerProject,
  TaskPickerProps,
  TaskPickerTask,
} from "./TaskPicker";
import { TaskPicker, TaskPickerPanel } from "./TaskPicker";

const projects: TaskPickerProject[] = [
  { id: 1, name: "Nordlicht", color: "project-2" },
  { id: 2, name: "Intern", color: "project-1" },
  { id: 3, name: "Kranich", color: "project-7" },
  { id: 4, name: "Leuchtturm", color: "project-8" },
  { id: 5, name: "Werkbank", color: "project-6" },
];

const tasks: TaskPickerTask[] = [
  { id: 11, name: "Kick-Off", projectId: 1, trackedMinutes: 85 },
  { id: 12, name: "Brain aufsetzen", projectId: 1, trackedMinutes: 764 },
  { id: 13, name: "Einarbeiten", projectId: 1, trackedMinutes: 14 },
  { id: 21, name: "Tag planen", projectId: 2, trackedMinutes: 49 },
  { id: 22, name: "Nachrichten lesen", projectId: 2, trackedMinutes: 7 },
  { id: 31, name: "Adapter anbinden", projectId: 3, trackedMinutes: 320 },
  { id: 32, name: "Wöchentliche Runde", projectId: 3, trackedMinutes: 21 },
  { id: 41, name: "Werkzeuge testen", projectId: 4, trackedMinutes: 112 },
  { id: 51, name: "Workshop vorbereiten", projectId: 5 },
];

/** Keys that reached the elements around the picker. */
const outerKeys = fn();
const outerSubmit = fn();

/** Holds the value and adds created tasks, as the app would. */
function Harness(props: TaskPickerProps) {
  const [value, setValue] = useState(props.value);
  const [list, setList] = useState(props.tasks);
  const { onCreateTask } = props;
  return (
    // The spy stands for a table row or form that reacts to Enter.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="min-h-130 max-w-90"
      onKeyDown={(e) => {
        outerKeys(e.key);
      }}
    >
      <TaskPicker
        {...props}
        tasks={list}
        value={value}
        onChange={(next) => {
          props.onChange(next);
          setValue(next);
        }}
        onCreateTask={
          onCreateTask &&
          (async (name, projectId) => {
            const id = await onCreateTask(name, projectId);
            setList((all) => [...all, { id, name, projectId }]);
            return id;
          })
        }
      />
    </div>
  );
}

const meta = {
  title: "TaskPicker",
  component: TaskPicker,
  args: {
    label: "Aufgabe",
    projects,
    tasks,
    value: null,
    onChange: fn(),
    onCreateTask: fn((): TaskPickerKey | Promise<TaskPickerKey> => 100),
  },
  render: (args) => <Harness {...args} />,
} satisfies Meta<typeof TaskPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

/**
 * The spies in `args` are shared by all stories and both themes, so each
 * play function starts with fresh ones.
 */
function reset() {
  clearAllMocks();
}

async function open(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button"));
  const search = await body().findByRole("textbox", {
    name: "Aufgabe suchen oder neu anlegen …",
  });
  await waitFor(() => expect(search).toHaveFocus());
  return search;
}

const option = (name: string | RegExp) => body().getByRole("option", { name });

/** The open list with a chosen task: groups, times and the check. */
export const Open: Story = {
  args: { value: 21 },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await expect(option(/Tag planen/)).toHaveAttribute("aria-selected", "true");
  },
};

export const Empty: Story = {};

export const Selected: Story = { args: { value: 12 } };

export const Disabled: Story = { args: { value: 12, isDisabled: true } };

/** A long task and project name are cut off in the trigger. */
export const LongNames: Story = {
  args: {
    value: 1,
    projects: [
      {
        id: 1,
        name: "Ein Projekt mit einem sehr langen Namen für den Test",
        color: "project-4",
      },
    ],
    tasks: [
      {
        id: 1,
        name: "Eine Aufgabe, deren Name nicht in die Zeile passt und gekürzt wird",
        projectId: 1,
        trackedMinutes: 6001,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
  },
};

/** Twelve projects: the list scrolls, the group heads stay on top. */
export const ManyProjects: Story = {
  args: {
    projects: Array.from({ length: 12 }, (_, i) => ({
      id: i,
      name: `Projekt ${String.fromCharCode(65 + i)}`,
      color: `project-${(i % 18) + 1}`,
    })),
    tasks: Array.from({ length: 36 }, (_, i) => ({
      id: i,
      name: `Aufgabe ${i + 1}`,
      projectId: i % 12,
      trackedMinutes: i * 7,
    })),
  },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await expect(body().getAllByRole("option")).toHaveLength(37);
  },
};

/** No tasks at all: the list says so. */
export const NoTasks: Story = {
  args: { tasks: [], allowNoTask: false },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await expect(body().getByText("Noch keine Aufgaben.")).toBeInTheDocument();
  },
};

/**
 * The search finds tasks by their name and whole projects by the project
 * name, marks the match and offers the create row on top.
 */
export const SearchWithMatches: Story = {
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("nord");
    await waitFor(() => expect(body().getAllByRole("option")).toHaveLength(3));
    // A project match keeps all tasks of the group.
    await expect(option(/Kick-Off/)).toBeInTheDocument();
    await expect(body().queryByRole("option", { name: "Ohne Aufgabe" })).toBe(
      null,
    );
    await userEvent.clear(body().getByRole("textbox"));
    await userEvent.keyboard("plan");
    // A task match keeps only the matching tasks.
    await waitFor(() =>
      expect(body().getAllByRole("option")).toEqual([option(/Tag planen/)]),
    );
    await expect(
      body().getByRole("button", {
        name: "„plan“ als neue Aufgabe in Intern anlegen",
      }),
    ).toBeInTheDocument();
  },
};

/** Nothing matches: a hint, and Enter alone creates the task. */
export const NoMatches: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Rechnung schreiben");
    await expect(
      body().getByText("Keine Aufgabe gefunden – Enter legt sie neu an."),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(args.onCreateTask).toHaveBeenCalledWith(
      "Rechnung schreiben",
      2,
    );
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(100));
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
  args: { lastProjectId: 2 },
  parameters: { screenshot: false },
};

/** The second step: the project for the new task. */
export const ProjectStep: Story = {
  args: { onCreateProject: fn() },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Werk");
    await userEvent.click(
      await body().findByRole("button", { name: /^Projekt: / }),
    );
    await expect(
      await body().findByRole("textbox", { name: "Projekt suchen …" }),
    ).toHaveFocus();
    // "Werk" names a project, so that one is the suggestion.
    await expect(option("Werkbank")).toHaveAttribute("aria-selected", "true");
  },
};

/** Without "no task" the list starts with the first project. */
export const WithoutNoTask: Story = {
  args: { allowNoTask: false },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await expect(body().queryByRole("option", { name: "Ohne Aufgabe" })).toBe(
      null,
    );
  },
  parameters: { screenshot: false },
};

/** Opens on mount with the focus in the search, as in the slot row. */
export const OpenOnMount: Story = {
  args: { defaultOpen: true },
  play: async () => {
    reset();
    await waitFor(() => expect(body().getByRole("textbox")).toHaveFocus());
  },
  parameters: { screenshot: false },
};

/**
 * Arrow down opens the closed field, arrows skip the group heads, Enter
 * picks and closes, the focus goes back to the trigger. No Enter from the
 * open picker reaches the row around it.
 */
export const KeyboardPick: Story = {
  play: async ({ args }) => {
    reset();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    const search = await body().findByRole("textbox");
    await waitFor(() => expect(search).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(option("Ohne Aufgabe")).toHaveAttribute("data-focused");
    await userEvent.keyboard("{ArrowDown}");
    // The head "Intern" is skipped; its first task is next.
    await expect(option(/Nachrichten lesen/)).toHaveAttribute("data-focused");
    await expect(search).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(22);
    const trigger = body().getByRole("button", { name: /Nachrichten lesen/ });
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(body().queryByRole("listbox")).toBe(null);
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
  parameters: { screenshot: false },
};

/**
 * Enter on the closed field belongs to the row around it, such as "save":
 * it reaches the row and opens nothing.
 */
export const KeyboardEnterOnTrigger: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(outerKeys).toHaveBeenCalledWith("Enter");
    await expect(body().queryByRole("dialog")).toBe(null);
    await expect(args.onChange).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** Alt with arrow down opens the closed field. */
export const KeyboardOpenAltArrow: Story = {
  play: async () => {
    reset();
    await userEvent.tab();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await waitFor(() => expect(body().getByRole("textbox")).toHaveFocus());
  },
  parameters: { screenshot: false },
};

/** Space opens the closed field. */
export const KeyboardOpenSpace: Story = {
  play: async () => {
    reset();
    await userEvent.tab();
    await userEvent.keyboard(" ");
    const search = await body().findByRole("textbox");
    await waitFor(() => expect(search).toHaveFocus());
    await expect(search).toHaveValue("");
  },
  parameters: { screenshot: false },
};

/** A typed letter opens the closed field and starts the search. */
export const KeyboardOpenTyping: Story = {
  play: async () => {
    reset();
    await userEvent.tab();
    await userEvent.keyboard("K");
    const search = await body().findByRole("textbox");
    await waitFor(() => expect(search).toHaveFocus());
    await expect(search).toHaveValue("K");
    await userEvent.keyboard("ick");
    await expect(search).toHaveValue("Kick");
    await waitFor(() => expect(option(/Kick-Off/)).toBeInTheDocument());
  },
  parameters: { screenshot: false },
};

/** Typing marks the first match; Enter picks it, not the create row. */
export const KeyboardPickFirstMatch: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("kick");
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenCalledWith(11);
    await expect(args.onCreateTask).not.toHaveBeenCalled();
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
  parameters: { screenshot: false },
};

/** Escape closes and gives the focus back to the trigger. */
export const KeyboardEscape: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    const search = await open(canvasElement);
    await userEvent.type(search, "kick");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(canvasElement).getByRole("button")).toHaveFocus(),
    );
    await expect(body().queryByRole("dialog")).toBe(null);
    await expect(args.onChange).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** Ctrl or Cmd with Enter creates the typed task even with matches. */
export const KeyboardCreate: Story = {
  args: { lastProjectId: 3 },
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await expect(args.onCreateTask).toHaveBeenCalledTimes(1);
    await expect(args.onCreateTask).toHaveBeenCalledWith("Kick", 3);
    // The new task is picked right away, and only it.
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(100));
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(within(canvasElement).getByRole("button")).toHaveTextContent(
        "Kick· Kranich",
      ),
    );
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
  parameters: { screenshot: false },
};

/**
 * With the create row shown, Tab in the search goes to the project step;
 * a picked project returns the focus to the search, and Enter creates the
 * task there.
 */
export const KeyboardProjectStep: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.tab();
    const projectSearch = await body().findByRole("textbox", {
      name: "Projekt suchen …",
    });
    await waitFor(() => expect(projectSearch).toHaveFocus());
    await userEvent.keyboard("leu");
    await waitFor(() =>
      expect(option("Leuchtturm")).toHaveAttribute("data-focused"),
    );
    await userEvent.keyboard("{Enter}");
    const back = await body().findByRole("textbox", {
      name: "Aufgabe suchen oder neu anlegen …",
    });
    await waitFor(() => expect(back).toHaveFocus());
    await expect(back).toHaveValue("Kick");
    await expect(
      body().getByRole("button", { name: "Projekt: Leuchtturm, ändern" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(args.onCreateTask).toHaveBeenCalledWith("Kick", 4);
    await expect(args.onChange).not.toHaveBeenCalledWith(11);
    await expect(outerKeys).not.toHaveBeenCalledWith("Enter");
  },
  parameters: { screenshot: false },
};

/** "Back" returns to the search without changing the project. */
export const ProjectStepBack: Story = {
  args: { lastProjectId: 2 },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await userEvent.click(
      await body().findByRole("button", { name: "Zurück" }),
    );
    await waitFor(() =>
      expect(
        body().getByRole("textbox", {
          name: "Aufgabe suchen oder neu anlegen …",
        }),
      ).toHaveFocus(),
    );
    await expect(
      body().getByRole("button", { name: "Projekt: Intern, ändern" }),
    ).toBeInTheDocument();
  },
  parameters: { screenshot: false },
};

/** "New project …" hands the typed text to the app and uses its project. */
export const CreateProject: Story = {
  args: { onCreateProject: fn(() => 3) },
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await body().findByRole("textbox", { name: "Projekt suchen …" });
    await userEvent.keyboard("Kran");
    await userEvent.click(
      body().getByRole("button", { name: "Neues Projekt …" }),
    );
    await expect(args.onCreateProject).toHaveBeenCalledWith("Kran");
    await expect(
      await body().findByRole("button", { name: "Projekt: Kranich, ändern" }),
    ).toBeInTheDocument();
  },
  parameters: { screenshot: false },
};

/**
 * A new project the app has not yet added to `projects` cannot take the
 * task: Enter waits instead of using another project.
 */
export const CreateProjectPending: Story = {
  args: { onCreateProject: fn(() => 77) },
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await body().findByRole("textbox", { name: "Projekt suchen …" });
    await userEvent.click(
      body().getByRole("button", { name: "Neues Projekt …" }),
    );
    await expect(
      await body().findByRole("button", {
        name: "Projekt: Projekt wird angelegt …, ändern",
      }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await expect(args.onCreateTask).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** "New project …" runs once, even when pressed twice. */
export const CreateProjectOnce: Story = {
  args: {
    onCreateProject: fn(
      () =>
        new Promise<TaskPickerKey>((resolve) => {
          setTimeout(() => resolve(3), 100);
        }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await body().findByRole("textbox", { name: "Projekt suchen …" });
    await userEvent.dblClick(
      body().getByRole("button", { name: "Neues Projekt …" }),
    );
    await expect(
      await body().findByRole("button", { name: "Projekt: Kranich, ändern" }),
    ).toBeInTheDocument();
    await expect(args.onCreateProject).toHaveBeenCalledTimes(1);
  },
  parameters: { screenshot: false },
};

/** A failed "New project …" stays in the step and says so. */
export const CreateProjectFails: Story = {
  args: {
    onCreateProject: fn(() => Promise.reject(new Error("offline"))),
  },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Kick");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await body().findByRole("textbox", { name: "Projekt suchen …" });
    await userEvent.click(
      body().getByRole("button", { name: "Neues Projekt …" }),
    );
    await expect(await body().findByRole("alert")).toHaveTextContent(
      "Das Projekt konnte nicht angelegt werden.",
    );
  },
  parameters: { screenshot: false },
};

/** A task with exactly the typed name is offered, no duplicate. */
export const ExactMatch: Story = {
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("kick-off");
    await expect(
      body().queryByRole("button", { name: /als neue Aufgabe/ }),
    ).toBe(null);
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await expect(args.onCreateTask).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** A value that is not in `tasks` has its own trigger text. */
export const UnknownValue: Story = {
  args: { value: 999 },
  play: async ({ canvasElement }) => {
    reset();
    await expect(within(canvasElement).getByRole("button")).toHaveTextContent(
      "Unbekannte Aufgabe",
    );
  },
  parameters: { screenshot: false },
};

/** Longer key texts wrap in the foot instead of being cut off. */
export const LongKeyHints: Story = {
  args: {
    labels: {
      keyMove: "auswählen und bewegen",
      keyPick: "übernehmen und schließen",
      keyCreate: "neue Aufgabe",
      keyClose: "alles schließen",
    },
  },
  play: async ({ canvasElement }) => {
    reset();
    await open(canvasElement);
    const hints = document.querySelector<HTMLElement>("[data-key-hints]");
    await expect(hints).not.toBe(null);
    await expect(hints?.scrollWidth).toBeLessThanOrEqual(
      hints?.clientWidth ?? 0,
    );
  },
  parameters: { screenshot: false },
};

/** A failed create keeps the picker open and says so. */
export const CreateFails: Story = {
  args: {
    onCreateTask: fn((): TaskPickerKey | Promise<TaskPickerKey> =>
      Promise.reject(new Error("offline")),
    ),
  },
  play: async ({ canvasElement, args }) => {
    reset();
    await open(canvasElement);
    await userEvent.keyboard("Neu{Control>}{Enter}{/Control}");
    await expect(await body().findByRole("alert")).toHaveTextContent(
      "Die Aufgabe konnte nicht angelegt werden.",
    );
    await expect(args.onChange).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};

/** The list without popover, for a dialog such as "Switch task". */
export const Panel: Story = {
  args: { value: 21 },
  render: (args) => (
    <form
      className="border-border bg-popover w-90 rounded-lg border"
      onSubmit={(e) => {
        e.preventDefault();
        outerSubmit();
      }}
    >
      <TaskPickerPanel {...args} />
    </form>
  ),
  play: async ({ args }) => {
    reset();
    await waitFor(() => expect(body().getByRole("textbox")).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await expect(args.onChange).toHaveBeenCalledWith(22);
    // Enter in the search fields does not submit the form around it.
    await userEvent.keyboard("zzz{Enter}");
    await userEvent.click(body().getByRole("button", { name: /^Projekt: / }));
    await waitFor(() =>
      expect(
        body().getByRole("textbox", { name: "Projekt suchen …" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Enter}");
    await expect(outerSubmit).not.toHaveBeenCalled();
  },
  parameters: { screenshot: false },
};
