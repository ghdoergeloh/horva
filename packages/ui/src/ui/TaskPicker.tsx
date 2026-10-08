"use client";

import type React from "react";
import type { Key, Selection } from "react-aria-components";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Plus, Search } from "lucide-react";
import {
  Autocomplete,
  Dialog,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Button as RACButton,
  TextField,
} from "react-aria-components";

import { focusRing } from "@horva/ui";

import type {
  TaskGroup,
  TaskPickerKey,
  TaskPickerProject,
  TaskPickerTask,
} from "./TaskPickerModel";
import { tv, twMerge } from "../lib/tw";
import { Button } from "./Button";
import { Kbd, ProjectDot } from "./Chip";
import { Popover } from "./Popover";
import {
  filterProjects,
  findMatch,
  formatMinutes,
  groupTasks,
  hasTaskNamed,
  suggestProject,
} from "./TaskPickerModel";

export type {
  TaskPickerKey,
  TaskPickerProject,
  TaskPickerTask,
} from "./TaskPickerModel";

/** All texts of the task picker. Each one has a German default. */
export interface TaskPickerLabels {
  /** The name of the field for screen readers when there is no `label`. */
  field: string;
  /** The entry and trigger text for "no task". */
  noTask: string;
  /** The trigger text when `value` is not in `tasks`. */
  unknownTask: string;
  /** The name of the popover. */
  dialog: string;
  search: string;
  list: string;
  /** No task matches and a new one can be created. */
  noMatchesCreate: string;
  /** No task matches and none can be created. */
  noMatches: string;
  /** There are no tasks at all. */
  noTasks: string;
  /** The text after the typed title in the create row. */
  createIn: string;
  /** The name of the create button for screen readers. */
  createTask: (title: string, project: string) => string;
  /** The name of the project chip in the create row. */
  changeProject: (project: string) => string;
  createFailed: string;
  /** The chip text while a new project is not yet in `projects`. */
  projectPending: string;
  createProjectFailed: string;
  back: string;
  /** The text before the typed title in the project step. */
  projectFor: string;
  projectSearch: string;
  projectList: string;
  noProjects: string;
  newProject: string;
  /** Key names in the hints. `keyMod` is Ctrl or Cmd. */
  keyArrows: string;
  keyEnter: string;
  keyMod: string;
  keyEscape: string;
  keyMove: string;
  keyPick: string;
  keyCreate: string;
  keyClose: string;
}

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
const modKey = isMac ? "⌘" : "Strg";

const defaultLabels: TaskPickerLabels = {
  field: "Aufgabe",
  noTask: "Ohne Aufgabe",
  unknownTask: "Unbekannte Aufgabe",
  dialog: "Aufgabe wählen",
  search: "Aufgabe suchen oder neu anlegen …",
  list: "Aufgaben",
  noMatchesCreate: "Keine Aufgabe gefunden – Enter legt sie neu an.",
  noMatches: "Keine Aufgabe gefunden.",
  noTasks: "Noch keine Aufgaben.",
  createIn: "als neue Aufgabe in",
  createTask: (title, project) =>
    `„${title}“ als neue Aufgabe in ${project} anlegen`,
  changeProject: (project) => `Projekt: ${project}, ändern`,
  createFailed: "Die Aufgabe konnte nicht angelegt werden.",
  projectPending: "Projekt wird angelegt …",
  createProjectFailed: "Das Projekt konnte nicht angelegt werden.",
  back: "Zurück",
  projectFor: "Projekt für",
  projectSearch: "Projekt suchen …",
  projectList: "Projekte",
  noProjects: "Kein Projekt gefunden.",
  newProject: "Neues Projekt …",
  keyArrows: "↑↓",
  keyEnter: "Enter",
  keyMod: modKey,
  keyEscape: "esc",
  keyMove: "wählen",
  keyPick: "übernehmen",
  keyCreate: "neu",
  keyClose: "schließen",
};

export interface TaskPickerPanelProps {
  projects: readonly TaskPickerProject[];
  tasks: readonly TaskPickerTask[];
  /** The chosen task; `null` is "no task". */
  value: TaskPickerKey | null;
  /** Called with the picked or newly created task, `null` for "no task". */
  onChange: (value: TaskPickerKey | null) => void;
  /**
   * Creates a task and returns its id; the picker then picks it. Without
   * this prop the picker offers no create row.
   */
  onCreateTask?: (
    name: string,
    projectId: TaskPickerKey,
  ) => Promise<TaskPickerKey> | TaskPickerKey;
  /**
   * Called by "New project …" in the project step with the typed search
   * text. Return the id of the new project (already part of `projects`) to
   * use it for the new task. Without this prop the entry is hidden.
   */
  onCreateProject?: (
    name: string,
  ) => Promise<TaskPickerKey | void> | TaskPickerKey | void;
  /** The project a new task goes into when the search names no project. */
  lastProjectId?: TaskPickerKey | null;
  /** Whether "no task" is offered. @default true */
  allowNoTask?: boolean;
  /** Formats tracked minutes. @default `h:mm` */
  formatDuration?: (minutes: number) => string;
  labels?: Partial<TaskPickerLabels>;
  /** The search text the panel starts with. */
  defaultQuery?: string;
  className?: string;
}

const NONE = "none";
const taskKey = (id: TaskPickerKey) => `task:${String(id)}`;
const projectKey = (id: TaskPickerKey) => `project:${String(id)}`;
/** The list is filtered by the picker, so the autocomplete keeps all. */
const keepAll = () => true;

const optionStyles = tv({
  base: "group flex min-h-8 cursor-default items-center gap-2 rounded-md py-1 pr-2 text-body text-popover-foreground outline-0 forced-color-adjust-none hover:bg-accent hover:text-accent-foreground data-focused:bg-accent data-focused:text-accent-foreground forced-colors:data-focused:bg-[Highlight] forced-colors:data-focused:text-[HighlightText]",
  variants: {
    indent: { true: "pl-5.5", false: "pl-2" },
  },
});

/** Marks where the query occurs in the text. */
function Highlight({ text, query }: { text: string; query: string }) {
  const match = findMatch(text, query);
  if (!match) return text;
  const [start, end] = match;
  return (
    <>
      {text.slice(0, start)}
      <mark className="decoration-primary bg-transparent font-bold text-inherit underline decoration-2 underline-offset-2">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

function SelectedCheck({ isSelected }: { isSelected: boolean }) {
  return (
    <span className="flex w-4 shrink-0 items-center">
      {isSelected && <Check aria-hidden className="text-primary size-4" />}
    </span>
  );
}

function SearchInput({ label }: { label: string }) {
  return (
    <TextField
      aria-label={label}
      // The picker opens on a user action; the search field is where the
      // typing goes.
      // oxlint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      className="border-border flex h-11 items-center gap-2 border-b px-3"
    >
      <Search aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Input
        placeholder={label}
        className="text-foreground placeholder:text-muted-foreground text-body min-w-0 flex-1 border-0 bg-transparent font-sans outline-0"
      />
    </TextField>
  );
}

/**
 * Whatever Enter did inside the open picker, such as picking or creating a
 * task, it does nothing more in a form or table row around it.
 */
function keepEnterInside(e: React.KeyboardEvent) {
  if (e.key === "Enter") e.stopPropagation();
}

/** The row on top of the list that creates the typed task. */
function CreateRow({
  title,
  project,
  armed,
  pending,
  labels,
  onCreate,
  onChangeProject,
}: {
  title: string;
  /** `undefined` while a new project is not yet in `projects`. */
  project: TaskPickerProject | undefined;
  armed: boolean;
  pending: boolean;
  labels: TaskPickerLabels;
  onCreate: () => void;
  onChangeProject: () => void;
}) {
  const projectName = project?.name ?? labels.projectPending;
  return (
    <div className="border-border border-b p-1">
      <div
        data-armed={armed || undefined}
        className="text-primary hover:bg-accent hover:text-accent-foreground data-armed:bg-accent data-armed:text-accent-foreground flex min-h-9.5 items-center gap-1 rounded-md px-2 py-1.5"
      >
        <RACButton
          onPress={onCreate}
          // Not `isPending`: its announcement points at the button, which
          // is gone once the task exists.
          isDisabled={!project || pending}
          // Keyboard users create with Ctrl/Cmd+Enter; Tab in the search
          // opens the project step.
          excludeFromTabOrder
          aria-label={labels.createTask(title, projectName)}
          className={(renderProps) =>
            focusRing({
              ...renderProps,
              className:
                "text-body flex min-w-0 items-center gap-2 rounded-sm text-start outline-offset-0",
            })
          }
        >
          <Plus aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 break-words">
            <b className="font-semibold">„{title}“</b> {labels.createIn}
          </span>
        </RACButton>
        <RACButton
          onPress={onChangeProject}
          aria-label={labels.changeProject(projectName)}
          className={(renderProps) =>
            focusRing({
              ...renderProps,
              className:
                "bg-secondary text-secondary-foreground text-caption inline-flex h-6.5 max-w-40 min-w-0 shrink-0 items-center gap-1.5 rounded-sm px-2 font-medium",
            })
          }
        >
          <ProjectDot color={project?.color} size="sm" />
          <span className="truncate">{projectName}</span>
          <ChevronDown aria-hidden className="size-3 shrink-0" />
        </RACButton>
        <Kbd className="ms-auto shrink-0 max-sm:hidden">
          {labels.keyMod} {labels.keyEnter}
        </Kbd>
      </div>
    </div>
  );
}

/** The short help on the keys, below the list. */
function KeyHints({
  labels,
  canCreate,
}: {
  labels: TaskPickerLabels;
  canCreate: boolean;
}) {
  return (
    <div
      aria-hidden
      data-key-hints
      className="border-border bg-muted text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 border-t px-3 py-1.5 text-[11px] leading-4 max-sm:hidden"
    >
      <span className="whitespace-nowrap">
        <Kbd className="me-1">{labels.keyArrows}</Kbd>
        {labels.keyMove}
      </span>
      <span className="whitespace-nowrap">
        <Kbd className="me-1">{labels.keyEnter}</Kbd>
        {labels.keyPick}
      </span>
      {canCreate && (
        <span className="whitespace-nowrap">
          <Kbd className="me-1">
            {labels.keyMod} {labels.keyEnter}
          </Kbd>
          {labels.keyCreate}
        </span>
      )}
      <span className="whitespace-nowrap">
        <Kbd className="me-1">{labels.keyEscape}</Kbd>
        {labels.keyClose}
      </span>
    </div>
  );
}

/** One project in the list: its sticky head and its tasks. */
function TaskGroupSection({
  group,
  query,
  formatDuration,
}: {
  group: TaskGroup;
  query: string;
  formatDuration: (minutes: number) => string;
}) {
  return (
    <ListBoxSection>
      <Header className="border-border bg-popover text-popover-foreground text-small sticky top-(--picker-top) z-10 mt-1 flex items-center gap-2 border-t px-2 pt-2.5 pb-1 font-semibold [[role=option]+section>&]:mt-0 [[role=option]+section>&]:border-t-0 [section:first-child>&]:mt-0 [section:first-child>&]:border-t-0">
        <ProjectDot color={group.project.color} />
        <span className="truncate">
          <Highlight text={group.project.name} query={query} />
        </span>
        <span className="text-muted-foreground ms-auto font-mono text-[11px] leading-4 font-normal">
          {group.tasks.length}
        </span>
      </Header>
      {group.tasks.map((task) => (
        <ListBoxItem
          key={taskKey(task.id)}
          id={taskKey(task.id)}
          textValue={task.name}
          className={optionStyles({ indent: true })}
        >
          {({ isSelected }) => (
            <>
              <span className="min-w-0 flex-1 truncate">
                <Highlight text={task.name} query={query} />
              </span>
              {task.trackedMinutes != null && (
                <span className="type-duration-small text-muted-foreground group-hover:text-accent-foreground group-data-focused:text-accent-foreground shrink-0">
                  {formatDuration(task.trackedMinutes)}
                </span>
              )}
              <SelectedCheck isSelected={isSelected} />
            </>
          )}
        </ListBoxItem>
      ))}
    </ListBoxSection>
  );
}

/** A message that an action failed, read out at once. */
function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="text-destructive text-caption border-border border-b px-3 py-1.5"
    >
      {children}
    </p>
  );
}

/**
 * The scroll area of one step: a sticky top with the search field, the
 * list, and a sticky foot. The search field sits inside the scroll area,
 * so the area has keyboard access although the list uses virtual focus.
 * `--picker-top` holds the height of the top for the sticky group heads.
 */
function ScrollFrame({
  top,
  foot,
  className,
  children,
}: {
  top: React.ReactNode;
  foot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(0);
  useLayoutEffect(() => {
    const element = topRef.current;
    if (!element) return;
    const update = () => setTopHeight(element.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={twMerge(
        "min-h-0 overflow-y-auto overscroll-contain scroll-pt-[calc(var(--picker-top)+2.5rem)] scroll-pb-10",
        className,
      )}
      style={{ "--picker-top": `${topHeight}px` } as React.CSSProperties}
    >
      <div ref={topRef} className="bg-popover sticky top-0 z-20">
        {top}
      </div>
      {children}
      {foot && <div className="sticky bottom-0 z-20">{foot}</div>}
    </div>
  );
}

/**
 * The task list with search, grouped by project, and the steps to create a
 * task. `TaskPicker` shows it in a popover; a dialog such as "Switch task"
 * can show it directly. Enter in the panel never reaches the elements
 * around it.
 */
export function TaskPickerPanel({
  projects,
  tasks,
  value,
  onChange,
  onCreateTask,
  onCreateProject,
  lastProjectId,
  allowNoTask = true,
  formatDuration = formatMinutes,
  labels: labelOverrides,
  defaultQuery = "",
  className,
}: TaskPickerPanelProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  const [query, setQuery] = useState(defaultQuery);
  const [projectQuery, setProjectQuery] = useState("");
  const [step, setStep] = useState<"tasks" | "project">("tasks");
  const [chosenProjectId, setChosenProjectId] = useState<TaskPickerKey>();
  // After a project was picked, Enter creates the task.
  const [createArmed, setCreateArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [projectPending, setProjectPending] = useState(false);
  const [projectFailed, setProjectFailed] = useState(false);
  // Guards against a second press before the pending state has rendered.
  const busy = useRef(false);

  const title = query.trim();
  const groups = useMemo(
    () => groupTasks(projects, tasks, query),
    [projects, tasks, query],
  );
  const taskIds = useMemo(
    () => new Map(tasks.map((task) => [taskKey(task.id), task.id])),
    [tasks],
  );
  const chosenProject = projects.find((p) => p.id === chosenProjectId);
  // A picked or new project that is not yet in `projects`: wait for it
  // instead of falling back to the suggestion.
  const waitingForProject = chosenProjectId !== undefined && !chosenProject;
  const targetProject = waitingForProject
    ? undefined
    : (chosenProject ?? suggestProject(projects, query, lastProjectId));
  const showCreateRow =
    !!onCreateTask &&
    title !== "" &&
    (!!targetProject || waitingForProject) &&
    !hasTaskNamed(tasks, title);
  const canCreate = showCreateRow && !!targetProject;

  async function create() {
    if (!onCreateTask || !targetProject || !canCreate || busy.current) return;
    busy.current = true;
    setPending(true);
    setFailed(false);
    try {
      onChange(await onCreateTask(title, targetProject.id));
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function backToTasks() {
    setStep("tasks");
    setProjectQuery("");
  }

  function pickProject(id: TaskPickerKey) {
    setChosenProjectId(id);
    setCreateArmed(true);
    backToTasks();
  }

  async function createProject() {
    if (!onCreateProject || busy.current) return;
    busy.current = true;
    setProjectPending(true);
    setProjectFailed(false);
    try {
      const id = await onCreateProject(projectQuery.trim());
      if (id != null) pickProject(id);
    } catch {
      setProjectFailed(true);
    } finally {
      busy.current = false;
      setProjectPending(false);
    }
  }

  function onTaskSelection(keys: Selection) {
    if (keys === "all") return;
    const [key] = keys;
    // Picking the current entry again deselects it; it still counts as a pick.
    if (key === undefined) onChange(value);
    else if (key === NONE) onChange(null);
    else {
      const id = taskIds.get(String(key));
      if (id !== undefined) onChange(id);
    }
  }

  function onProjectSelection(keys: Selection) {
    if (keys === "all") return;
    const [key] = keys;
    const project =
      key === undefined
        ? targetProject
        : projects.find((p) => projectKey(p.id) === key);
    if (project) pickProject(project.id);
  }

  // Runs before the search field and the list see the key.
  function onKeyDownCapture(e: React.KeyboardEvent) {
    if (e.key.startsWith("Arrow")) setCreateArmed(false);
    if (!(e.target instanceof HTMLInputElement)) return;
    const inSearch = step === "tasks";
    if (e.key === "Tab" && !e.shiftKey && inSearch && showCreateRow) {
      // Tab moves on to the project of the new task.
      e.preventDefault();
      e.stopPropagation();
      setStep("project");
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    // The search fields may sit in a form; Enter must not submit it.
    e.preventDefault();
    const wantsCreate =
      e.metaKey || e.ctrlKey || createArmed || groups.length === 0;
    if (inSearch && showCreateRow && wantsCreate) {
      e.stopPropagation();
      void create();
    }
  }

  let emptyText = labels.noTasks;
  if (title) emptyText = canCreate ? labels.noMatchesCreate : labels.noMatches;

  const selectedKeys: Key[] =
    value === null ? (allowNoTask ? [NONE] : []) : [taskKey(value)];

  return (
    // The handlers only keep Enter inside; the controls within are the
    // interactive elements.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={twMerge(
        "text-popover-foreground flex max-h-[inherit] min-h-0 flex-col font-sans",
        className,
      )}
      onKeyDownCapture={onKeyDownCapture}
      onKeyDown={keepEnterInside}
    >
      {step === "tasks" ? (
        <Autocomplete
          // Each step has its own autocomplete state.
          key="tasks"
          inputValue={query}
          onInputChange={(text) => {
            setQuery(text);
            setCreateArmed(false);
            setFailed(false);
          }}
          filter={keepAll}
        >
          <ScrollFrame
            className="max-h-104"
            top={
              <>
                <SearchInput label={labels.search} />
                {showCreateRow && (
                  <CreateRow
                    title={title}
                    project={targetProject}
                    armed={createArmed}
                    pending={pending}
                    labels={labels}
                    onCreate={() => void create()}
                    onChangeProject={() => setStep("project")}
                  />
                )}
                {failed && <ErrorLine>{labels.createFailed}</ErrorLine>}
              </>
            }
            foot={<KeyHints labels={labels} canCreate={!!onCreateTask} />}
          >
            <ListBox
              aria-label={labels.list}
              selectionMode="single"
              selectedKeys={selectedKeys}
              onSelectionChange={onTaskSelection}
              escapeKeyBehavior="none"
              renderEmptyState={() => (
                <p className="text-muted-foreground text-small px-3 py-4 text-center">
                  {emptyText}
                </p>
              )}
              className="p-1 outline-0"
            >
              {!title && allowNoTask && (
                <ListBoxItem
                  id={NONE}
                  textValue={labels.noTask}
                  className={optionStyles({
                    indent: false,
                    className: "text-muted-foreground",
                  })}
                >
                  {({ isSelected }) => (
                    <>
                      <span className="flex-1 truncate">{labels.noTask}</span>
                      <SelectedCheck isSelected={isSelected} />
                    </>
                  )}
                </ListBoxItem>
              )}
              {groups.map((group) => (
                <TaskGroupSection
                  key={projectKey(group.project.id)}
                  group={group}
                  query={query}
                  formatDuration={formatDuration}
                />
              ))}
            </ListBox>
          </ScrollFrame>
        </Autocomplete>
      ) : (
        <Autocomplete
          key="project"
          inputValue={projectQuery}
          onInputChange={setProjectQuery}
          filter={keepAll}
        >
          <ScrollFrame
            className="max-h-90"
            top={
              <>
                <div className="border-border text-muted-foreground text-small flex items-center gap-2 border-b px-2 py-1.5">
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={labels.back}
                    onPress={backToTasks}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <span className="truncate">
                    {labels.projectFor}{" "}
                    <b className="text-popover-foreground font-semibold">
                      „{title}“
                    </b>
                  </span>
                </div>
                <SearchInput label={labels.projectSearch} />
                {projectFailed && (
                  <ErrorLine>{labels.createProjectFailed}</ErrorLine>
                )}
              </>
            }
            foot={
              onCreateProject && (
                <div className="border-border bg-popover border-t p-1">
                  <RACButton
                    onPress={() => void createProject()}
                    isDisabled={projectPending}
                    className={(renderProps) =>
                      focusRing({
                        ...renderProps,
                        className:
                          "text-primary hover:bg-accent hover:text-accent-foreground text-body flex min-h-9.5 w-full items-center gap-2 rounded-md px-2 py-1.5 text-start -outline-offset-2",
                      })
                    }
                  >
                    <Plus aria-hidden className="size-4 shrink-0" />
                    {labels.newProject}
                  </RACButton>
                </div>
              )
            }
          >
            <ListBox
              aria-label={labels.projectList}
              selectionMode="single"
              selectedKeys={targetProject ? [projectKey(targetProject.id)] : []}
              onSelectionChange={onProjectSelection}
              escapeKeyBehavior="none"
              renderEmptyState={() => (
                <p className="text-muted-foreground text-small px-3 py-4 text-center">
                  {labels.noProjects}
                </p>
              )}
              className="p-1 outline-0"
            >
              {filterProjects(projects, projectQuery).map((project) => (
                <ListBoxItem
                  key={projectKey(project.id)}
                  id={projectKey(project.id)}
                  textValue={project.name}
                  className={optionStyles({ indent: false })}
                >
                  {({ isSelected }) => (
                    <>
                      <ProjectDot color={project.color} />
                      <span className="min-w-0 flex-1 truncate">
                        <Highlight text={project.name} query={projectQuery} />
                      </span>
                      <SelectedCheck isSelected={isSelected} />
                    </>
                  )}
                </ListBoxItem>
              ))}
            </ListBox>
          </ScrollFrame>
        </Autocomplete>
      )}
    </div>
  );
}

const triggerStyles =
  "border-input-border bg-input text-foreground text-body outline-ring flex h-9 w-full min-w-45 cursor-default items-center gap-2 rounded-md border ps-2.5 pe-2 text-start font-sans outline-offset-2 transition [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 enabled:hover:bg-accent disabled:opacity-45 forced-colors:outline-[Highlight] forced-colors:disabled:text-[GrayText]";

export interface TaskPickerProps extends TaskPickerPanelProps {
  /** The visible label above the field. */
  label?: string;
  /** The trigger text when no task is chosen. @default labels.noTask */
  placeholder?: string;
  isDisabled?: boolean;
  /** Opens the picker on mount with the focus in the search field. */
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * A field to pick a task: the trigger shows project dot, task and project;
 * the popover holds the `TaskPickerPanel`. Picking or creating a task
 * closes it and gives the focus back to the trigger.
 *
 * Keys on the closed field: arrow down (also with Alt), Space or a typed
 * character open it; the character starts the search. Enter does not open
 * it and reaches the elements around, such as a row that saves on Enter.
 */
export function TaskPicker({
  label,
  placeholder,
  isDisabled,
  defaultOpen = false,
  isOpen,
  onOpenChange,
  className,
  ...panel
}: TaskPickerProps) {
  const labels = { ...defaultLabels, ...panel.labels };
  const [openState, setOpenState] = useState(defaultOpen);
  const [startQuery, setStartQuery] = useState("");
  const open = isOpen ?? openState;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;

  function setOpen(next: boolean) {
    setOpenState(next);
    onOpenChange?.(next);
    if (!next) triggerRef.current?.focus();
  }

  function openWith(query: string) {
    setStartQuery(query);
    setOpen(true);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter") {
      // Belongs to the row or form around the field; no click, no opening.
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      openWith("");
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      openWith(e.key);
    }
  }

  const task =
    panel.value === null
      ? undefined
      : panel.tasks.find((t) => t.id === panel.value);
  const project = task
    ? panel.projects.find((p) => p.id === task.projectId)
    : undefined;
  let emptyText = placeholder ?? labels.noTask;
  if (panel.value !== null && !task) emptyText = labels.unknownTask;

  return (
    <div
      data-disabled={isDisabled ? true : undefined}
      className={twMerge("flex flex-col gap-1 font-sans", className)}
    >
      <span
        id={labelId}
        className={
          label ? "text-foreground text-small w-fit font-medium" : "sr-only"
        }
      >
        {label ?? labels.field}
      </span>
      <button
        ref={triggerRef}
        type="button"
        disabled={isDisabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        className={triggerStyles}
        onClick={() => openWith("")}
        onKeyDown={onTriggerKeyDown}
      >
        <span id={valueId} className="flex min-w-0 flex-1 items-center gap-2">
          {task ? (
            <>
              <ProjectDot color={project?.color} />
              <span className="truncate">{task.name}</span>
              {project && (
                <span className="text-muted-foreground min-w-0 shrink-[2] truncate">
                  · {project.name}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground truncate">{emptyText}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
      </button>
      <Popover
        triggerRef={triggerRef}
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom start"
        className="w-[max(var(--trigger-width),22.5rem)] overflow-hidden max-sm:w-[calc(100vw-1.5rem)]"
      >
        <Dialog
          aria-label={labels.dialog}
          className="max-h-[inherit] outline-0"
        >
          <TaskPickerPanel
            {...panel}
            defaultQuery={startQuery}
            onChange={(next) => {
              panel.onChange(next);
              setOpen(false);
            }}
          />
        </Dialog>
      </Popover>
    </div>
  );
}
