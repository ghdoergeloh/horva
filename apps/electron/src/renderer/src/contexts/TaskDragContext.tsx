import type {
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "~/lib/orpc.js";

/**
 * Payload attached to every draggable task, so a drop handler can act on the
 * task without looking it up in whichever list happens to be mounted.
 */
export interface TaskDragData {
  type: "task";
  taskId: number;
  name: string;
  projectId: number;
}

/** Marks a droppable as a project target. Drop routing keys off this tag
 * rather than the id or payload shape, so adding droppables elsewhere can
 * never be mistaken for a project. */
export const PROJECT_DROP_TYPE = "project";

/** Droppable id for a sidebar project. Namespaced to avoid colliding with the
 * numeric task ids used by the sortable list on the overview page. */
export function projectDroppableId(projectId: number): string {
  return `project-drop-${String(projectId)}`;
}

/** Data payload attached to a project droppable. */
export function projectDropData(projectId: number) {
  return { type: PROJECT_DROP_TYPE, projectId };
}

export function isTaskDragData(value: unknown): value is TaskDragData {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "task"
  );
}

interface TaskDragContextValue {
  /** The task currently being dragged, or null. Lets the sidebar light up
   * valid drop targets only while a drag is in progress. */
  activeTask: TaskDragData | null;
  /**
   * Registers a handler for drops that are *not* onto a project, so a list can
   * keep owning its own reordering. Returns an unsubscribe function.
   *
   * Needed because a single DndContext dispatches to exactly one onDragEnd;
   * without this the hoisted provider would swallow the overview's reorder.
   */
  registerReorderHandler: (
    handler: (event: DragEndEvent) => void,
  ) => () => void;
}

const TaskDragContext = createContext<TaskDragContextValue | undefined>(
  undefined,
);

/**
 * Hosts the app-wide DndContext.
 *
 * It lives above both the sidebar and the routed content, because a task card
 * rendered inside <Outlet/> must be able to drop onto a project in the sidebar
 * — two sibling subtrees that a route-level DndContext could never span.
 *
 * Reordering within a list is handled by the list itself via `onDragEnd`
 * registered through {@link useTaskDrag}; this provider only owns the
 * cross-cutting "move task to project" drop.
 */
export function TaskDragProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskDragData | null>(null);
  const reorderHandlers = useRef(new Set<(event: DragEndEvent) => void>());

  const registerReorderHandler = useCallback(
    (handler: (event: DragEndEvent) => void) => {
      const handlers = reorderHandlers.current;
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /**
   * Sidebar projects require the cursor to be genuinely inside them, but a
   * sortable list needs a nearest-match fallback so drops in the gaps between
   * rows (or past the last row) still land somewhere.
   *
   * pointerWithin alone returns no collision in those cases — and returns
   * nothing at all for keyboard drags, which have no pointer coordinates — so
   * it is used only to detect project drops, with closestCenter over the
   * remaining (task) droppables handling reordering.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const isProjectContainer = (container: { data: { current?: unknown } }) => {
      const data = container.data.current;
      return (
        typeof data === "object" &&
        data !== null &&
        (data as { type?: unknown }).type === PROJECT_DROP_TYPE
      );
    };

    const projectIds = new Set(
      args.droppableContainers.filter(isProjectContainer).map((c) => c.id),
    );

    const projectHit = pointerWithin(args).find((collision) =>
      projectIds.has(collision.id),
    );
    if (projectHit) return [projectHit];

    // Not over a project: restrict to task droppables so a sidebar entry can
    // never win by proximity alone.
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => !projectIds.has(container.id),
      ),
    });
  }, []);

  const moveMutation = useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      client.task.update({ id, projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function handleDragStart(event: DragStartEvent) {
    const data: unknown = event.active.data.current;
    setActiveTask(isTaskDragData(data) ? data : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const data: unknown = active.data.current;
    if (!isTaskDragData(data)) return;

    // Route on the explicit tag, not on the id type or payload shape, so new
    // droppables elsewhere can't be misread as a project.
    const overData: unknown = over.data.current;
    const isProjectDrop =
      typeof overData === "object" &&
      overData !== null &&
      (overData as { type?: unknown }).type === PROJECT_DROP_TYPE;

    if (!isProjectDrop) {
      for (const handler of reorderHandlers.current) handler(event);
      return;
    }

    const targetProjectId = (overData as { projectId: number }).projectId;

    // Dropping on the project it already belongs to is a no-op.
    if (targetProjectId === data.projectId) return;

    moveMutation.mutate({ id: data.taskId, projectId: targetProjectId });
  }

  const value = useMemo<TaskDragContextValue>(
    () => ({ activeTask, registerReorderHandler }),
    [activeTask, registerReorderHandler],
  );

  return (
    <TaskDragContext value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        {children}
        {/* Compact preview rather than a full TaskCard — the overlay only has
            to identify what is being dragged. */}
        <DragOverlay>
          {activeTask ? (
            <div className="border-border bg-card text-foreground cursor-grabbing rounded-lg border px-3 py-2 text-sm shadow-lg">
              {activeTask.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TaskDragContext>
  );
}

export function useTaskDrag() {
  const ctx = useContext(TaskDragContext);
  if (!ctx) throw new Error("useTaskDrag must be used within TaskDragProvider");
  return ctx;
}
