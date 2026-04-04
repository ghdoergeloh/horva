# Drag and Drop: Library Selection and Patterns

> Research intensity: standard
> Date: 2026-03-10
> Status: research complete

## Summary

This document compares the three candidate drag-and-drop libraries for the Electron + React 19 app (task items moving between project sections/lists) and provides the definitive recommendation with exact install instructions and a minimal multi-list code pattern.

---

## Candidate Comparison

### 1. @dnd-kit/core + @dnd-kit/sortable

| Property        | Detail                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| Latest versions | `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`                                             |
| React peer dep  | `>=16.8.0` (effectively works with React 19, no explicit block)                               |
| Last publish    | Active, maintained                                                                            |
| TypeScript      | First-class — all events are fully typed                                                      |
| Bundle size     | Small, tree-shakeable, no runtime CSS dependencies                                            |
| Architecture    | Headless — you own 100% of the markup and styling                                             |
| Accessibility   | Built-in keyboard sensor + screen reader announcements                                        |
| Electron        | No known issues; uses Pointer Events API which works normally in Electron's Chromium renderer |

**React 19 status:** The peer dependency `>=16.8.0` does not block React 19. The library uses standard React hooks with no deprecated APIs. There is a separate, experimental `@dnd-kit/react` package (v0.3.x) that is **not** production-ready and is unrelated to `@dnd-kit/core` — do not use it.

**Multi-list support:** Fully supported and the most common use case in the community. The pattern uses multiple `SortableContext` providers inside one `DndContext`, with `onDragOver` handling cross-list moves in real time and `onDragEnd` committing the final state.

---

### 2. react-beautiful-dnd (Atlassian)

Deprecated. Atlassian stopped maintenance in 2022. Do not use.

---

### 3. @hello-pangea/dnd

| Property       | Detail                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Latest version | `18.0.1` (published February 9, 2025)                                   |
| React peer dep | `^18.0.0 \|\| ^19.0.0` — **explicitly supports React 19**               |
| Last publish   | February 2025                                                           |
| TypeScript     | Good, migrated from JS to TS                                            |
| Bundle size    | Larger than dnd-kit; brings its own animation and positioning logic     |
| Architecture   | Opinionated — uses `Droppable`/`Draggable` render-prop components       |
| Accessibility  | Strong, inherited from react-beautiful-dnd's original accessible design |
| Electron       | No known issues reported                                                |

**Multi-list support:** Supported natively through `onDragEnd` result object (`source` and `destination` include `droppableId`). No extra logic needed during drag. Simpler initial setup for the list-to-list case.

**Downside:** The render-prop API (`provided`, `snapshot`) is more verbose and less composable than dnd-kit's hooks. The library is a community fork that closely mirrors the original Atlassian code — it is not being actively redesigned. Maintenance is reactive (patch releases only).

---

## Recommendation: @dnd-kit/core + @dnd-kit/sortable

**Use dnd-kit.** The reasoning:

1. **Hooks-based API** fits naturally with React 19's composition model. No render props, no `forwardRef` gymnastics.
2. **Headless** — you style everything with Tailwind classes directly on your own elements, no library CSS to override.
3. **Actively developed** codebase with a large community, extensive Kanban/multi-list examples, and no deprecated React APIs.
4. **React 19 works in practice.** The peer dep `>=16.8.0` is deliberately broad. There are no reported runtime failures with React 19. The experimental `@dnd-kit/react` package is a separate, unrelated thing.
5. **Electron.** No special configuration required. The `PointerSensor` works in Chromium's renderer process normally. The only Electron-relevant setting is the existing `contextIsolation` / `sandbox` — no additional flags needed.
6. **Better long-term bet.** @hello-pangea/dnd is viable but is essentially a maintenance fork of a deprecated library. dnd-kit is designed from scratch for modern React.

The one trade-off: the cross-list logic requires a bit more code than @hello-pangea/dnd's `onDragEnd` result object. The pattern below makes this concrete and contained.

---

## Packages to Install

Add to `apps/electron/package.json` (or whichever app needs DnD):

```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

Install:

```bash
pnpm --filter @timetracker/electron-app add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

`@dnd-kit/utilities` is a small helper package that provides `CSS.Transform.toString()` — needed for the transform style applied during drag.

---

## Minimal Multi-List Pattern

This is the minimal complete pattern for dragging task items between project sections (columns). It is adapted to the project's TypeScript strict mode conventions.

### Types

```typescript
// types.ts
export interface Task {
  id: string;
  title: string;
}

export type SectionId = string;

export interface Section {
  id: SectionId;
  title: string;
  taskIds: string[];
}
```

### State shape

```typescript
// State lives in the parent component (or a TanStack Query mutation optimistic update)
const [tasks, setTasks] = useState<Record<string, Task>>({ ... });
const [sections, setSections] = useState<Section[]>([...]);
```

### Board component

```typescript
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";

import { SectionColumn } from "./SectionColumn";
import { TaskCard } from "./TaskCard";
import type { Section, Task } from "./types";

interface Props {
  initialTasks: Record<string, Task>;
  initialSections: Section[];
}

export function Board({ initialTasks, initialSections }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [sections, setSections] = useState(initialSections);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Activate drag only after a 5px move — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findSectionOfTask(taskId: UniqueIdentifier): Section | undefined {
    return sections.find((s) => s.taskIds.includes(String(taskId)));
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id);
  }

  // Called continuously while dragging — updates section membership in real time
  function handleDragOver({ active, over }: DragOverEvent) {
    if (over == null || active.id === over.id) return;

    const activeSection = findSectionOfTask(active.id);
    // 'over' can be either a task or an empty section droppable
    const overSection =
      findSectionOfTask(over.id) ??
      sections.find((s) => s.id === String(over.id));

    if (
      activeSection == null ||
      overSection == null ||
      activeSection.id === overSection.id
    ) {
      return;
    }

    setSections((prev) =>
      prev.map((section) => {
        if (section.id === activeSection.id) {
          return {
            ...section,
            taskIds: section.taskIds.filter((id) => id !== String(active.id)),
          };
        }
        if (section.id === overSection.id) {
          const overIndex = section.taskIds.indexOf(String(over.id));
          const insertAt = overIndex >= 0 ? overIndex : section.taskIds.length;
          const updated = [...section.taskIds];
          updated.splice(insertAt, 0, String(active.id));
          return { ...section, taskIds: updated };
        }
        return section;
      }),
    );
  }

  // Called once on drop — handles reordering within the same section
  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (over == null || active.id === over.id) return;

    const activeSection = findSectionOfTask(active.id);
    const overSection = findSectionOfTask(over.id);

    // Cross-section moves are already handled by onDragOver.
    // Only reorder within the same section here.
    if (
      activeSection == null ||
      overSection == null ||
      activeSection.id !== overSection.id
    ) {
      return;
    }

    const oldIndex = activeSection.taskIds.indexOf(String(active.id));
    const newIndex = activeSection.taskIds.indexOf(String(over.id));
    if (oldIndex === newIndex) return;

    setSections((prev) =>
      prev.map((section) =>
        section.id === activeSection.id
          ? { ...section, taskIds: arrayMove(section.taskIds, oldIndex, newIndex) }
          : section,
      ),
    );
  }

  const activeTask = activeId != null ? tasks[String(activeId)] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {sections.map((section) => (
          <SectionColumn
            key={section.id}
            section={section}
            tasks={section.taskIds.map((id) => tasks[id]).filter(Boolean) as Task[]}
          />
        ))}
      </div>

      {/* DragOverlay renders the "ghost" following the cursor */}
      <DragOverlay>
        {activeTask != null ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### SectionColumn component

```typescript
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { SortableTaskCard } from "./SortableTaskCard";
import type { Section, Task } from "./types";

interface Props {
  section: Section;
  tasks: Task[];
}

export function SectionColumn({ section, tasks }: Props) {
  // Make the column itself droppable so empty sections accept items
  const { setNodeRef } = useDroppable({ id: section.id });

  return (
    <div className="flex w-64 flex-col gap-2">
      <h2 className="font-semibold">{section.title}</h2>
      <SortableContext
        id={section.id}
        items={section.taskIds}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="min-h-12 flex flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

### SortableTaskCard (the draggable item)

```typescript
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Task } from "./types";

interface Props {
  task: Task;
  isOverlay?: boolean;
}

export function SortableTaskCard({ task, isOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "rounded-md border bg-white p-3 shadow-sm",
        isDragging && !isOverlay ? "opacity-40" : "",
        isOverlay ? "rotate-2 shadow-lg" : "",
      ].join(" ")}
    >
      {task.title}
    </div>
  );
}
```

```typescript
// TaskCard is the same visual but without sortable logic — used inside DragOverlay
export function TaskCard({ task, isOverlay = false }: Props) {
  return (
    <div className={["rounded-md border bg-white p-3 shadow-sm", isOverlay ? "rotate-2 shadow-lg" : ""].join(" ")}>
      {task.title}
    </div>
  );
}
```

---

## Key Implementation Notes

- **`onDragOver` does the cross-section move.** `onDragEnd` only handles same-section reorders. This separation is the standard dnd-kit multi-container pattern — do not merge them.
- **Empty sections.** `useDroppable({ id: section.id })` on the column wrapper makes empty sections valid drop targets. Without this, once you drag all tasks out of a section you can never drag back in.
- **`DragOverlay`.** Always use `DragOverlay` for the visual ghost. Setting `opacity-40` on the `isDragging` item (the "placeholder" position) and rendering the real visual in the overlay gives the best UX. Skip the overlay and you get a cloned but poorly behaved ghost.
- **`activationConstraint: { distance: 5 }`.** Critical for Electron where clicks on task cards may also open detail views — without a constraint, any mousedown triggers drag mode.
- **`closestCorners` collision detection.** Works better than the default `closestCenter` for multi-column Kanban layouts.
- **TanStack Query integration.** Run `setSections` optimistically in `onDragEnd` (or `onDragOver`), then call your mutation to persist. On mutation error, invalidate the query to revert to server state.

---

## References

- [dnd-kit official docs](https://dndkit.com)
- [@dnd-kit/core on npm](https://www.npmjs.com/package/@dnd-kit/core)
- [@dnd-kit/sortable docs — multiple containers](https://dndkit.com/presets/sortable)
- [@hello-pangea/dnd releases — v18.0.1 React 19 support](https://github.com/hello-pangea/dnd/releases)
- [React 19 discussion on hello-pangea/dnd](https://github.com/hello-pangea/dnd/discussions/810)
- [dnd-kit roadmap discussion (@dnd-kit/react vs @dnd-kit/core)](https://github.com/clauderic/dnd-kit/discussions/1842)
- [Top 5 DnD libraries for React (Puck blog, 2026)](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)

---

## Skill Recommendation

**Recommendation:** No

**Reasoning:** The dnd-kit multi-container pattern has a specific but finite surface area — the `onDragOver`/`onDragEnd` split plus the empty-column droppable trick are the only non-obvious parts. This document captures everything needed. The pattern is unlikely to be re-researched since it doesn't change across projects; the code snippets here serve as the reusable reference.
