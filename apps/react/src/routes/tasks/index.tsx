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

import { Loader } from "@horva/ui/Logo";

import type { LabelRow } from "#/components/TaskEditControls.js";
import type { TaskDragData } from "#/contexts/TaskDragContext.js";
import { useTaskDrag } from "#/contexts/TaskDragContext.js";
import { client } from "#/lib/orpc.js";
import type { TaskRow } from "./-components/TaskListCard.js";
import { TaskListCard } from "./-components/TaskListCard.js";

/** One row of the list: the drag handle and the card. */
function SortableTaskRow({
  task,
  allLabels,
}: {
  task: TaskRow;
  allLabels: LabelRow[];
}) {
  const { t } = useTranslation();
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

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch gap-1 ${isDragging ? "relative z-10 opacity-80 [&>div]:shadow-md" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t("tasks.overview.dragHandle")}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md outline-offset-2 focus-visible:outline-2 active:cursor-grabbing"
        type="button"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskListCard task={task} allLabels={allLabels} />
      </div>
    </li>
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
  /* oxlint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const serverSet = new Set(serverOrder);
    const localSet = new Set(orderedIds);
    const sameSet =
      serverSet.size === localSet.size &&
      [...serverSet].every((id) => localSet.has(id));
    if (!sameSet) setOrderedIds(serverOrder);
  }, [serverOrder, orderedIds]);
  /* oxlint-enable react-hooks/set-state-in-effect */

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
        <Loader
          size={64}
          label={t("loading")}
          className="animate-delayed-show opacity-0"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-display text-foreground">
          {t("tasks.overview.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("tasks.overview.subtitle")}
        </p>
      </header>

      {orderedTasks.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed px-4 py-8 text-center">
          <p className="text-body text-foreground">
            {t("tasks.overview.empty")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("tasks.overview.emptyHint")}
          </p>
        </div>
      ) : (
        <SortableContext
          items={orderedIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {orderedTasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                allLabels={allLabels}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}

export const Route = createFileRoute("/tasks/")({ component: TasksOverview });
