import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { TaskDragData } from "~/contexts/TaskDragContext.js";

/**
 * Wraps a task card with a drag handle so it can be dropped onto a project in
 * the sidebar.
 *
 * Used by the lists that don't reorder (Today, per-project). The overview page
 * has its own sortable wrapper, because reordering and moving share one drag
 * there and useSortable already provides the handle.
 */
export function DraggableTask({
  task,
  children,
}: {
  task: TaskDragData;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${String(task.taskId)}`,
    data: task,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex items-stretch gap-1"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t("tasks.overview.dragToProject")}
        className="text-muted-foreground/70 hover:text-muted-foreground flex cursor-grab items-center px-1 active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
