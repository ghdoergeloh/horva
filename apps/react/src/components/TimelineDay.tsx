import type { Key } from "react-aria-components";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SlotDraft, SlotTableEditing } from "@horva/ui/SlotTable";
import type {
  TaskPickerKey,
  TaskPickerProject,
  TaskPickerTask,
} from "@horva/ui/TaskPicker";
import type { TimelineView } from "@horva/ui/WeekHeader";
import { AlertDialog } from "@horva/ui/AlertDialog";
import { Button } from "@horva/ui/Button";
import { Modal } from "@horva/ui/Modal";
import { ProjectBreakdown } from "@horva/ui/ProjectBreakdown";
import { SlotTable } from "@horva/ui/SlotTable";
import { WorkPeriodList } from "@horva/ui/WorkPeriodList";

import type {
  TimelinePeriod,
  TimelineProject,
  TimelineSlot,
} from "#/lib/timeline.js";
import { client } from "#/lib/orpc.js";
import { fmt } from "#/lib/timeFormatters.js";
import {
  draftTimes,
  neighborChanges,
  newSlotTimes,
  slotEdit,
  slotTitle,
  taskSummary,
  toTableSlot,
  toWorkPeriod,
} from "#/lib/timeline.js";
import {
  slotTableLabels,
  slotTexts,
  taskSummaryStrings,
  workPeriodLabels,
} from "#/lib/timelineLabels.js";

export interface TimelineDayProps {
  date: Date;
  /** The name of the day, such as `Do., 8.`. */
  dayName: string;
  view: TimelineView;
  /** The slots that start on this day, after the project filter. */
  slots: readonly TimelineSlot[];
  /** All slots that start on this day, for the neighbour note. */
  allSlots: readonly TimelineSlot[];
  periods: readonly TimelinePeriod[];
  /** Whether the project filter is on; gaps then hide. */
  isFiltered: boolean;
  now: Date;
  editing: SlotTableEditing | null;
  onEditingChange: (editing: SlotTableEditing | null) => void;
  projects: readonly TaskPickerProject[];
  tasks: readonly TaskPickerTask[];
  projectsById: ReadonlyMap<number, TimelineProject>;
  lastProjectId: number | null;
}

/** Puts text on the clipboard; rejects when the browser does not allow it. */
async function copyText(text: string) {
  // Old browsers and insecure origins have no clipboard API.
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  if (!navigator.clipboard) throw new Error("No clipboard");
  await navigator.clipboard.writeText(text);
}

/**
 * The content of an opened day: the slot table to read and edit slots,
 * the time per task, or the work periods to copy.
 */
export function TimelineDay({
  date,
  dayName,
  view,
  slots,
  allSlots,
  periods,
  isFiltered,
  now,
  editing,
  onEditingChange,
  projects,
  tasks,
  projectsById,
  lastProjectId,
}: TimelineDayProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{
    editing: SlotTableEditing;
    draft: SlotDraft<TaskPickerKey>;
  } | null>(null);
  const [toDelete, setToDelete] = useState<TimelineSlot | null>(null);
  const texts = slotTexts(t);

  if (view === "periods")
    return (
      <WorkPeriodList
        periods={periods.map((p) => toWorkPeriod(p, projectsById, texts))}
        now={now}
        onCopy={copyText}
        labels={workPeriodLabels(t)}
        className="pb-2"
      />
    );

  if (view === "tasks") {
    const summary = taskSummary(slots, now, texts);
    return (
      <ProjectBreakdown
        projects={summary}
        defaultExpandedKeys={summary.map((p) => p.id)}
        strings={taskSummaryStrings(t, dayName)}
        className="pb-2"
      />
    );
  }

  const editedSlot =
    editing?.kind === "slot"
      ? allSlots.find((s) => s.id === editing.id)
      : undefined;

  function setEditing(next: SlotTableEditing | null) {
    setDraft(null);
    onEditingChange(next);
  }

  async function save(
    values: SlotDraft<TaskPickerKey>,
    target: SlotTableEditing,
  ) {
    if (target.kind === "slot") {
      const slot = allSlots.find((s) => s.id === target.id);
      const edit = slot && slotEdit(slot, values);
      if (edit) await client.slot.edit(edit);
    } else {
      const times = draftTimes(values, target.start);
      if (!times) return;
      await client.slot.insert({
        startedAt: times.start,
        endedAt: times.end,
        taskId: values.taskId === null ? null : Number(values.taskId),
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
    setEditing(null);
  }

  async function createTask(name: string, projectId: TaskPickerKey) {
    const { task } = await client.task.create({
      name,
      projectId: Number(projectId),
    });
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    return task.id;
  }

  async function createProject(name: string) {
    const { project } = await client.project.create({ name });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    return project.id;
  }

  async function deleteSlot(slot: TimelineSlot) {
    await client.slot.delete({ id: slot.id });
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
  }

  // Which neighbour slots move when the open draft is saved.
  const current = draft && editing && draft.editing === editing ? draft : null;
  const times =
    current &&
    draftTimes(
      current.draft,
      editing?.kind === "new" ? editing.start : (editedSlot?.startedAt ?? date),
    );
  const notes = times
    ? neighborChanges(allSlots, times, editedSlot?.id ?? null).map((change) =>
        t(
          change.field === "endedAt"
            ? "timeline.neighborEnd"
            : "timeline.neighborStart",
          { task: slotTitle(change.slot, texts), time: fmt(change.to) },
        ),
      )
    : [];

  const editNote =
    notes.length > 0 || editedSlot ? (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {notes.length > 0 && <span>{notes.join(" ")}</span>}
        {editedSlot && (
          <Button
            variant="quiet"
            size="sm"
            onPress={() => {
              setEditing(null);
              setToDelete(editedSlot);
            }}
          >
            <Trash2 aria-hidden />
            {t("timeline.deleteSlot")}
          </Button>
        )}
      </span>
    ) : undefined;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const proposal =
    date <= today && !editing ? newSlotTimes(allSlots, date) : null;

  return (
    <div className="pb-2">
      <SlotTable
        slots={slots.map((s) => toTableSlot(s, texts))}
        now={now}
        editing={editing}
        onEdit={(id: Key) => setEditing({ kind: "slot", id })}
        onAddSlot={(gap) => setEditing({ kind: "new", ...gap })}
        onCancel={() => setEditing(null)}
        onSave={save}
        onDraftChange={(next) => {
          if (editing) setDraft({ editing, draft: next });
        }}
        editNote={editNote}
        showGaps={!isFiltered}
        projects={projects}
        tasks={tasks}
        onCreateTask={createTask}
        onCreateProject={createProject}
        lastProjectId={lastProjectId}
        labels={slotTableLabels(t)}
      />
      {proposal && (
        <Button
          variant="quiet"
          size="sm"
          className="mt-1"
          onPress={() => setEditing({ kind: "new", ...proposal })}
        >
          <Plus aria-hidden />
          {t("timeline.slotTable.addSlot")}
        </Button>
      )}
      <Modal
        isDismissable
        isOpen={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        {toDelete && (
          <AlertDialog
            variant="destructive"
            title={t("timeline.deleteTitle")}
            actionLabel={t("timeline.deleteAction")}
            cancelLabel={t("timeline.slotTable.cancel")}
            onAction={() => void deleteSlot(toDelete)}
          >
            {t("timeline.deleteText", {
              from: fmt(toDelete.startedAt),
              to: toDelete.endedAt ? fmt(toDelete.endedAt) : t("timeline.now"),
              task: slotTitle(toDelete, texts),
            })}
          </AlertDialog>
        )}
      </Modal>
    </div>
  );
}
