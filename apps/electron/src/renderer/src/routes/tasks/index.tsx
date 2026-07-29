import type { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { LabelRow } from "~/components/TaskEditControls.js";
import type { TaskDragData } from "~/contexts/TaskDragContext.js";
import { LoadingSpinner } from "~/components/LoadingSpinner.js";
import { TaskCard } from "~/components/TaskCard.js";
import { useDetailDrawer } from "~/contexts/DetailDrawerContext.js";
import { useTaskDrag } from "~/contexts/TaskDragContext.js";
import { client } from "~/lib/orpc.js";

type TaskRow = Awaited<ReturnType<typeof client.task.list>>["tasks"][number];

function calcTotalMinutes(slots: TaskRow["slots"]): number {
  return slots.reduce((sum, s) => {
    if (!s.endedAt) return sum;
    return (
      sum +
      Math.round(
        (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) /
          60000,
      )
    );
  }, 0);
}

interface SortableTaskRowProps {
  task: TaskRow;
  allLabels: LabelRow[];
  onMarkDone: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onPlan: (id: number, date: string | null) => void;
  onSetRecurrence: (id: number, rule: string | null) => void;
  onAddLabel: (taskId: number, labelId: number) => void;
  onRemoveLabel: (taskId: number, labelId: number) => void;
}

function SortableTaskRow({
  task,
  allLabels,
  onMarkDone,
  onRename,
  onPlan,
  onSetRecurrence,
  onAddLabel,
  onRemoveLabel,
}: SortableTaskRowProps) {
  const { t } = useTranslation();
  const { openTask } = useDetailDrawer();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    // Payload lets the app-shell drop handler move the task onto a project
    // without knowing which list it came from.
    data: {
      type: "task",
      taskId: task.id,
      name: task.name,
      projectId: task.project.id,
    } satisfies TaskDragData,
  });
  const isActivity = task.taskType === "activity";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-stretch gap-1"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t("tasks.overview.dragHandle")}
        className="text-muted-foreground/70 hover:text-muted-foreground flex cursor-grab items-center px-1 active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskCard
          id={task.id}
          name={task.name}
          project={task.project}
          labels={task.taskLabels.map((tl) => tl.label)}
          totalMinutes={calcTotalMinutes(task.slots)}
          isActivity={isActivity}
          scheduledAt={task.scheduledAt}
          recurrenceRule={task.recurrenceRule}
          allLabels={allLabels}
          onMarkDone={() => onMarkDone(task.id)}
          onRename={(name) => onRename(task.id, name)}
          onPlan={(date) => onPlan(task.id, date)}
          onSetRecurrence={
            isActivity ? (rule) => onSetRecurrence(task.id, rule) : undefined
          }
          onAddLabel={(labelId) => onAddLabel(task.id, labelId)}
          onRemoveLabel={(labelId) => onRemoveLabel(task.id, labelId)}
          onOpenDetails={() => openTask(task.id)}
        />
      </div>
    </div>
  );
}

function TasksOverview() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "overview"],
    queryFn: async () => {
      const res = await client.task.list({
        status: "open",
        taskType: "task",
      });
      return res.tasks;
    },
  });

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: async () => {
      const res = await client.label.list();
      return res.labels;
    },
  });

  // Local order — lets us reflect the drop immediately and send the whole order
  // to the backend at once.
  const [orderedIds, setOrderedIds] = useState<number[]>([]);

  const serverOrder = useMemo(() => tasks.map((t) => t.id), [tasks]);

  // Sync local order with the server whenever the underlying set of tasks changes
  // (new task, deleted task, etc). Compare as a set, not by order, so a drop
  // doesn't get reverted before the mutation completes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const serverSet = new Set(serverOrder);
    const localSet = new Set(orderedIds);
    const sameSet =
      serverSet.size === localSet.size &&
      [...serverSet].every((id) => localSet.has(id));
    if (!sameSet) setOrderedIds(serverOrder);
  }, [serverOrder, orderedIds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tasksById = useMemo(() => {
    const map = new Map<number, TaskRow>();
    for (const task of tasks) map.set(task.id, task);
    return map;
  }, [tasks]);

  const orderedTasks = orderedIds
    .map((id) => tasksById.get(id))
    .filter((t): t is TaskRow => t !== undefined);

  function invalidateTasks() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => client.task.reorder({ orderedIds: ids }),
    onSuccess: invalidateTasks,
  });

  const markDoneMutation = useMutation({
    mutationFn: (taskId: number) => client.task.done({ id: taskId }),
    onSuccess: () => {
      invalidateTasks();
      // Completing a running task stops its slot and starts a new empty one,
      // so the active-slot UI needs to refresh too.
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      client.task.update({ id, name }),
    onSuccess: invalidateTasks,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string | null }) =>
      client.task.plan({ id, date: date ? new Date(date) : null }),
    onSuccess: invalidateTasks,
  });

  const setRecurrenceMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: string | null }) =>
      client.task.update({ id, recurrenceRule: rule }),
    onSuccess: invalidateTasks,
  });

  const addLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      client.task.update({ id: taskId, addLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  const removeLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      client.task.update({ id: taskId, removeLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  // The DndContext lives in the app shell so tasks can be dropped onto the
  // sidebar; reordering stays here and is invoked for non-project drops.
  const { registerReorderHandler } = useTaskDrag();

  // Latest order + mutation, kept in a ref so the registered handler identity
  // stays stable — re-subscribing on every render risks losing a drop mid-drag.
  const reorderStateRef = useRef({ orderedIds, reorderMutation });
  useEffect(() => {
    reorderStateRef.current = { orderedIds, reorderMutation };
  }, [orderedIds, reorderMutation]);

  useEffect(() => {
    return registerReorderHandler((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      // Sortable rows use numeric ids; anything else belongs to another list.
      if (typeof active.id !== "number" || typeof over.id !== "number") return;
      const { orderedIds: ids, reorderMutation: mutation } =
        reorderStateRef.current;
      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(ids, oldIndex, newIndex);
      setOrderedIds(next);
      mutation.mutate(next);
    });
  }, [registerReorderHandler]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">
          {t("tasks.overview.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("tasks.overview.subtitle")}
        </p>
      </div>

      {orderedTasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("tasks.overview.empty")}
        </p>
      ) : (
        <SortableContext
          items={orderedIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedTasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                allLabels={allLabels}
                onMarkDone={(id) => markDoneMutation.mutate(id)}
                onRename={(id, name) => renameMutation.mutate({ id, name })}
                onPlan={(id, date) => planMutation.mutate({ id, date })}
                onSetRecurrence={(id, rule) =>
                  setRecurrenceMutation.mutate({ id, rule })
                }
                onAddLabel={(taskId, labelId) =>
                  addLabelMutation.mutate({ taskId, labelId })
                }
                onRemoveLabel={(taskId, labelId) =>
                  removeLabelMutation.mutate({ taskId, labelId })
                }
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export const Route = createFileRoute("/tasks/")({ component: TasksOverview });
