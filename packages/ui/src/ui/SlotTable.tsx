"use client";

import type React from "react";
import type { Key } from "react-aria-components";
import { useEffect, useRef, useState } from "react";
import { Time } from "@internationalized/date";
import { AlertCircle, Info, Pencil, Plus } from "lucide-react";

import type { ProjectColor } from "./Chip";
import type { ClockTime, DraftProblem, SlotDraft } from "./SlotTableModel";
import type {
  TaskPickerKey,
  TaskPickerProject,
  TaskPickerTask,
} from "./TaskPicker";
import { twMerge } from "../lib/tw";
import { Button } from "./Button";
import { Chip, Kbd, LiveBadge } from "./Chip";
import { formatClock, formatDuration, minutesBetween } from "./DayBarsModel";
import { checkDraft, clockOf, draftMinutes, withGaps } from "./SlotTableModel";
import { TaskPicker } from "./TaskPicker";
import { TimeField } from "./TimeField";

export type { ClockTime, SlotDraft } from "./SlotTableModel";

/** One slot of the day. */
export interface SlotTableSlot {
  id: Key;
  start: Date;
  /** `null` while the slot is running. */
  end: Date | null;
  taskId: TaskPickerKey | null;
  /** The task name; `null` for a slot without task. */
  task: string | null;
  project?: { name: string; color: ProjectColor | null } | null;
}

/** The row in edit mode: an existing slot, or a new one with preset times. */
export type SlotTableEditing =
  | { kind: "slot"; id: Key }
  | { kind: "new"; start: Date; end: Date };

/** All texts of the slot table. Each one has a German default. */
export interface SlotTableLabels {
  from: string;
  to: string;
  duration: string;
  task: string;
  project: string;
  actions: string;
  /** The end of a running slot. */
  now: string;
  noTask: string;
  gap: string;
  addSlot: string;
  /** The name of the button that adds a slot into a gap. */
  addSlotIn: (from: string, to: string) => string;
  /** The name of the edit button of a slot. */
  edit: (from: string, to: string) => string;
  empty: string;
  start: string;
  end: string;
  save: string;
  cancel: string;
  missingTime: string;
  endNotAfterStart: string;
  /** Shown after a click outside the open row. */
  unsaved: string;
}

const defaultLabels: SlotTableLabels = {
  from: "Von",
  to: "Bis",
  duration: "Dauer",
  task: "Aufgabe",
  project: "Projekt",
  actions: "Aktionen",
  now: "jetzt",
  noTask: "Ohne Aufgabe",
  gap: "Lücke",
  addSlot: "Slot eintragen",
  addSlotIn: (from, to) => `Slot von ${from} bis ${to} eintragen`,
  edit: (from, to) => `Slot ${from}–${to} bearbeiten`,
  empty: "Keine Slots an diesem Tag.",
  start: "Start",
  end: "Ende",
  save: "Speichern",
  cancel: "Abbrechen",
  missingTime: "Bitte Start und Ende eintragen.",
  endNotAfterStart: "Das Ende muss nach dem Start liegen.",
  unsaved: "Noch nicht gespeichert: Speichern oder Abbrechen.",
};

export interface SlotTableProps {
  slots: readonly SlotTableSlot[];
  /** The current time: the end of a running slot. */
  now: Date;
  /** The row in edit mode, if any. */
  editing?: SlotTableEditing | null;
  /** Called by the edit button of a slot. */
  onEdit?: (id: Key) => void;
  /** Called by "Slot eintragen" in a gap with its times. */
  onAddSlot?: (gap: { start: Date; end: Date }) => void;
  /** Called by Cancel and Escape. */
  onCancel?: () => void;
  /**
   * Called by Save and Enter with a valid draft. While a returned promise
   * is pending, the save button waits.
   */
  onSave?: (
    draft: SlotDraft<TaskPickerKey>,
    editing: SlotTableEditing,
  ) => void | Promise<void>;
  /** Called on each change of the draft, for example to find a neighbour to adjust. */
  onDraftChange?: (draft: SlotDraft<TaskPickerKey>) => void;
  /** A note below the open row, such as which neighbour slot moves. */
  editNote?: React.ReactNode;
  /** An error from saving, shown below the open row. */
  saveError?: string;
  /** Whether gaps between slots show as rows. @default true */
  showGaps?: boolean;
  /** The tasks and projects for the task picker of the open row. */
  projects: readonly TaskPickerProject[];
  tasks: readonly TaskPickerTask[];
  onCreateTask?: (
    name: string,
    projectId: TaskPickerKey,
  ) => Promise<TaskPickerKey> | TaskPickerKey;
  onCreateProject?: (
    name: string,
  ) => Promise<TaskPickerKey | void> | TaskPickerKey | void;
  lastProjectId?: TaskPickerKey | null;
  labels?: Partial<SlotTableLabels>;
  className?: string;
}

const cell = "border-border border-b px-2 py-1.75 align-middle";
const timeCell = twMerge(
  cell,
  "type-duration w-px font-normal whitespace-nowrap",
);
const durationCell = twMerge(
  cell,
  "type-duration text-muted-foreground w-px text-right font-normal whitespace-nowrap",
);
const actionCell = twMerge(cell, "w-px py-1 text-right whitespace-nowrap");
const projectCell = twMerge(cell, "w-px @max-lg:hidden");

const toTime = (time: ClockTime | null) =>
  time ? new Time(time.hour, time.minute) : null;
const fromTime = (time: Time | null): ClockTime | null =>
  time ? { hour: time.hour, minute: time.minute } : null;

interface EditRowProps {
  initial: SlotDraft<TaskPickerKey>;
  isRunning: boolean;
  now: Date;
  editing: SlotTableEditing;
  props: SlotTableProps;
  labels: SlotTableLabels;
}

/**
 * The row in edit mode. Enter saves, also on the closed task field, and
 * never opens the task list with it; Escape cancels. A click outside keeps
 * the draft and marks it as not saved. Keys and clicks inside the task
 * popover belong to the picker, not to the row.
 */
function EditRow({
  initial,
  isRunning,
  now,
  editing,
  props,
  labels,
}: EditRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [draft, setDraft] = useState(initial);
  const [problem, setProblem] = useState<DraftProblem | null>(null);
  const [marked, setMarked] = useState(false);
  const [saving, setSaving] = useState(false);
  const pickerOpen = useRef(false);
  const { onSave, onCancel, onDraftChange } = props;

  useEffect(() => {
    // Capture phase: React Aria stops some pointer events before they
    // bubble up to the document.
    function onPointerDown(e: PointerEvent) {
      if (pickerOpen.current) return;
      if (rowRef.current?.contains(e.target as Node)) return;
      setMarked(true);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  function update(change: Partial<SlotDraft<TaskPickerKey>>) {
    const next = { ...draft, ...change };
    setDraft(next);
    setProblem(null);
    onDraftChange?.(next);
  }

  async function save() {
    if (saving) return;
    const found = checkDraft(draft, isRunning);
    setProblem(found);
    if (found) return;
    const result = onSave?.(draft, editing);
    if (!result) return;
    setSaving(true);
    try {
      await result;
    } finally {
      // The row may be gone after a successful save.
      if (rowRef.current) setSaving(false);
    }
  }

  function onKeyDownCapture(e: React.KeyboardEvent) {
    // Keys in the task popover reach the row through the React tree only.
    if (!rowRef.current?.contains(e.target as Node)) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel?.();
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const button = (e.target as HTMLElement).closest("button");
    // Save and Cancel handle Enter themselves.
    if (button && !button.closest("[data-task-field]")) return;
    e.preventDefault();
    e.stopPropagation();
    void save();
  }

  const minutes = isRunning
    ? draft.start && draftMinutes({ start: draft.start, end: clockOf(now) })
    : draftMinutes(draft);
  const message =
    problem === "missingTime"
      ? labels.missingTime
      : problem === "endNotAfterStart"
        ? labels.endNotAfterStart
        : props.saveError;

  return (
    <tr
      ref={rowRef}
      data-editing
      data-marked={marked || undefined}
      onKeyDownCapture={onKeyDownCapture}
      onFocusCapture={() => setMarked(false)}
      className="bg-accent text-foreground"
    >
      <td
        colSpan={6}
        className={twMerge(
          cell,
          "px-2 py-1.5",
          marked && "ring-primary ring-2 ring-inset",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TimeField
            aria-label={labels.start}
            // The row opens on a user action; the start is where editing begins.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            hourCycle={24}
            shouldForceLeadingZeros
            value={toTime(draft.start)}
            onChange={(value) => update({ start: fromTime(value) })}
            isInvalid={
              problem !== null &&
              (!draft.start || problem === "endNotAfterStart")
            }
            className="w-20"
          />
          {isRunning ? (
            <LiveBadge className="w-20 justify-center">{labels.now}</LiveBadge>
          ) : (
            <TimeField
              aria-label={labels.end}
              hourCycle={24}
              shouldForceLeadingZeros
              value={toTime(draft.end)}
              onChange={(value) => update({ end: fromTime(value) })}
              isInvalid={
                problem !== null &&
                (!draft.end || problem === "endNotAfterStart")
              }
              className="w-20"
            />
          )}
          <span
            className={twMerge(
              "type-duration w-11 text-right",
              isRunning ? "text-running-text" : "text-muted-foreground",
            )}
          >
            {minutes == null ? "–" : formatDuration(minutes)}
          </span>
          <div data-task-field className="min-w-48 flex-1 @max-lg:basis-full">
            <TaskPicker
              projects={props.projects}
              tasks={props.tasks}
              value={draft.taskId}
              onChange={(taskId) => update({ taskId })}
              onOpenChange={(open) => {
                pickerOpen.current = open;
              }}
              onCreateTask={props.onCreateTask}
              onCreateProject={props.onCreateProject}
              lastProjectId={props.lastProjectId}
              className="min-w-0"
            />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="quiet" size="sm" onPress={onCancel}>
              {labels.cancel}
            </Button>
            <Button size="sm" isPending={saving} onPress={() => void save()}>
              {labels.save}
              <span aria-hidden className="@max-lg:hidden">
                <Kbd>Enter</Kbd>
              </span>
            </Button>
          </div>
        </div>
        {(message || props.editNote || marked) && (
          <div className="text-caption mt-1.5 flex flex-col gap-1 font-normal">
            {message && (
              <p role="alert" className="flex items-center gap-2">
                <AlertCircle
                  aria-hidden
                  className="text-destructive size-4 shrink-0"
                />
                {message}
              </p>
            )}
            {props.editNote && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Info aria-hidden className="text-info size-4 shrink-0" />
                {props.editNote}
              </p>
            )}
            {marked && (
              <p role="status" className="flex items-center gap-2 font-medium">
                <Info aria-hidden className="text-primary size-4 shrink-0" />
                {labels.unsaved}
              </p>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

/** A read-only row of a slot. */
function SlotRow({
  slot,
  now,
  labels,
  isDisabled,
  onEdit,
}: {
  slot: SlotTableSlot;
  now: Date;
  labels: SlotTableLabels;
  isDisabled: boolean;
  onEdit?: (id: Key) => void;
}) {
  const isRunning = slot.end === null;
  const from = formatClock(slot.start);
  const to = slot.end ? formatClock(slot.end) : labels.now;
  const chip = slot.project ? (
    <Chip color={slot.project.color} title={slot.project.name}>
      {slot.project.name}
    </Chip>
  ) : null;
  return (
    <tr className={isRunning ? undefined : "hover:bg-accent"}>
      <td className={timeCell}>{from}</td>
      <td className={timeCell}>
        {isRunning ? <LiveBadge>{labels.now}</LiveBadge> : to}
      </td>
      <td className={twMerge(durationCell, isRunning && "text-running-text")}>
        {formatDuration(minutesBetween(slot.start, slot.end ?? now))}
      </td>
      <td className={twMerge(cell, "text-body min-w-0")}>
        <span
          className={slot.task === null ? "text-muted-foreground" : undefined}
        >
          {slot.task ?? labels.noTask}
        </span>
        {chip && <div className="mt-0.5 hidden @max-lg:block">{chip}</div>}
      </td>
      <td className={projectCell}>{chip}</td>
      <td className={actionCell}>
        {onEdit && (
          <Button
            variant="quiet"
            size="sm"
            aria-label={labels.edit(from, to)}
            isDisabled={isDisabled}
            onPress={() => onEdit(slot.id)}
          >
            <Pencil aria-hidden />
          </Button>
        )}
      </td>
    </tr>
  );
}

/** A quiet row for a gap between two slots, with "Slot eintragen". */
function GapRow({
  start,
  end,
  labels,
  isDisabled,
  onAddSlot,
}: {
  start: Date;
  end: Date;
  labels: SlotTableLabels;
  isDisabled: boolean;
  onAddSlot?: (gap: { start: Date; end: Date }) => void;
}) {
  const from = formatClock(start);
  const to = formatClock(end);
  return (
    <tr className="text-muted-foreground italic">
      <td className={twMerge(timeCell, "py-0.75")}>{from}</td>
      <td className={twMerge(timeCell, "py-0.75")}>{to}</td>
      <td className={twMerge(durationCell, "py-0.75")}>
        {formatDuration(minutesBetween(start, end))}
      </td>
      <td colSpan={2} className={twMerge(cell, "py-0.75")}>
        {labels.gap}
      </td>
      <td className={twMerge(actionCell, "py-0.75 not-italic")}>
        {onAddSlot && (
          <Button
            variant="quiet"
            size="sm"
            aria-label={labels.addSlotIn(from, to)}
            isDisabled={isDisabled}
            onPress={() => onAddSlot({ start, end })}
          >
            <Plus aria-hidden />
            <span className="@max-lg:sr-only">{labels.addSlot}</span>
          </Button>
        )}
      </td>
    </tr>
  );
}

type Row =
  | { kind: "slot"; slot: SlotTableSlot }
  | { kind: "gap"; start: Date; end: Date }
  | { kind: "new"; start: Date; end: Date };

/** The rows of the table, with the row of a new slot in its place. */
function buildRows(
  slots: readonly SlotTableSlot[],
  showGaps: boolean,
  editing: SlotTableEditing | null | undefined,
): Row[] {
  const rows: Row[] = withGaps(slots).filter(
    (row) => showGaps || row.kind === "slot",
  );
  if (editing?.kind !== "new") return rows;
  const added: Row = { kind: "new", start: editing.start, end: editing.end };
  const startOf = (row: Row) =>
    row.kind === "slot" ? row.slot.start : row.start;
  const gap = rows.findIndex(
    (row) =>
      row.kind === "gap" &&
      row.start.getTime() === editing.start.getTime() &&
      row.end.getTime() === editing.end.getTime(),
  );
  if (gap >= 0) rows.splice(gap, 1, added);
  else {
    const after = rows.findIndex(
      (row) => startOf(row).getTime() > editing.start.getTime(),
    );
    rows.splice(after < 0 ? rows.length : after, 0, added);
  }
  return rows;
}

/**
 * The slots of one day as a table: read them, fill gaps, edit one row at a
 * time. The open row has Save and Cancel; Enter saves, Escape cancels, a
 * click outside keeps the draft and marks it (#34). While a row is open
 * the other rows cannot be opened.
 */
export function SlotTable(props: SlotTableProps) {
  const {
    slots,
    now,
    editing,
    onEdit,
    onAddSlot,
    showGaps = true,
    labels: labelOverrides,
    className,
  } = props;
  const labels = { ...defaultLabels, ...labelOverrides };
  const rows = buildRows(slots, showGaps, editing);
  const isEditing = editing != null;

  return (
    <div className={twMerge("@container font-sans", className)}>
      <table className="text-body text-foreground w-full border-collapse">
        <thead>
          <tr className="text-caption text-muted-foreground text-left">
            <th className={twMerge(cell, "py-1.5 font-medium")}>
              {labels.from}
            </th>
            <th className={twMerge(cell, "py-1.5 font-medium")}>{labels.to}</th>
            <th className={twMerge(cell, "py-1.5 text-right font-medium")}>
              {labels.duration}
            </th>
            <th className={twMerge(cell, "w-full py-1.5 font-medium")}>
              {labels.task}
            </th>
            <th className={twMerge(projectCell, "py-1.5 font-medium")}>
              {labels.project}
            </th>
            <th className={twMerge(cell, "py-1.5")}>
              <span className="sr-only">{labels.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className={twMerge(
                  cell,
                  "text-muted-foreground text-small py-3",
                )}
              >
                {labels.empty}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            if (row.kind === "new" && editing)
              return (
                <EditRow
                  key={`new:${String(row.start.getTime())}`}
                  initial={{
                    start: clockOf(row.start),
                    end: clockOf(row.end),
                    taskId: null,
                  }}
                  isRunning={false}
                  now={now}
                  editing={editing}
                  props={props}
                  labels={labels}
                />
              );
            if (row.kind === "slot") {
              const { slot } = row;
              if (editing?.kind === "slot" && editing.id === slot.id)
                return (
                  <EditRow
                    key={`slot:${String(slot.id)}`}
                    initial={{
                      start: clockOf(slot.start),
                      end: slot.end && clockOf(slot.end),
                      taskId: slot.taskId,
                    }}
                    isRunning={slot.end === null}
                    now={now}
                    editing={editing}
                    props={props}
                    labels={labels}
                  />
                );
              return (
                <SlotRow
                  key={`slot:${String(slot.id)}`}
                  slot={slot}
                  now={now}
                  labels={labels}
                  isDisabled={isEditing}
                  onEdit={onEdit}
                />
              );
            }
            return (
              <GapRow
                key={`gap:${String(row.start.getTime())}`}
                start={row.start}
                end={row.end}
                labels={labels}
                isDisabled={isEditing}
                onAddSlot={onAddSlot}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
