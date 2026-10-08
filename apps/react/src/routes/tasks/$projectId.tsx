import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChevronRight, Plus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { ProjectDot } from "@horva/ui/Chip";
import { Loader } from "@horva/ui/Logo";
import { TextField } from "@horva/ui/TextField";

import { DraggableTask } from "#/components/DraggableTask.js";
import { useDetailDrawer } from "#/contexts/DetailDrawerContext.js";
import { client } from "#/lib/orpc.js";
import type { TaskRow } from "./-components/TaskListCard.js";
import { TaskListCard } from "./-components/TaskListCard.js";

type TaskType = "task" | "activity";

/**
 * A section of the project page with a heading that folds it, the number
 * of its entries and an optional action on the right.
 */
function Section({
  title,
  count,
  action,
  isOpen,
  onOpenChange,
  children,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: ReactNode;
}) {
  const panelId = useId();
  return (
    <section className="space-y-3">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 className="text-foreground">
          <Button
            variant="quiet"
            size="sm"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onPress={() => onOpenChange(!isOpen)}
            className="text-heading -ml-2.5 gap-1.5 font-semibold"
          >
            <ChevronRight
              aria-hidden
              className={`text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
            {title}
            {count !== undefined && (
              <span className="text-muted-foreground text-small font-normal">
                {count}
              </span>
            )}
          </Button>
        </h2>
        {action}
      </div>
      <div id={panelId} hidden={!isOpen}>
        {isOpen && children}
      </div>
    </section>
  );
}

/** The row to name a new task or activity. Enter creates, Escape closes. */
function NewTaskForm({
  label,
  onClose,
  onCreate,
}: {
  label: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <form
      className="bg-card border-border flex flex-wrap items-center gap-2 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <TextField
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The row opens on a user action.
        autoFocus
        aria-label={label}
        value={name}
        onChange={setName}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        placeholder={t("tasks.newTaskPlaceholder")}
        className="min-w-48 flex-1"
      />
      <div className="flex gap-2">
        <Button variant="secondary" onPress={onClose}>
          {t("tasks.cancel")}
        </Button>
        <Button type="submit" isDisabled={!name.trim()}>
          {t("tasks.create")}
        </Button>
      </div>
    </form>
  );
}

/** A list of cards that can be dragged onto a project in the sidebar. */
function TaskList({
  tasks,
  allLabels,
  empty,
}: {
  tasks: TaskRow[];
  allLabels: { id: number; name: string }[];
  empty: string;
}) {
  if (tasks.length === 0)
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <DraggableTask
            task={{
              type: "task",
              taskId: task.id,
              name: task.name,
              projectId: task.project.id,
            }}
          >
            <TaskListCard task={task} allLabels={allLabels} />
          </DraggableTask>
        </li>
      ))}
    </ul>
  );
}

const PAGE_SIZE = 100;

/** The done tasks of the project, loaded page by page on first open. */
function DoneTasksSection({
  projectId,
  allLabels,
}: {
  projectId: number;
  allLabels: { id: number; name: string }[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [accumulated, setAccumulated] = useState<TaskRow[]>([]);

  // Reset when navigating to a different project
  /* oxlint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOpen(false);
    setPage(0);
    setAccumulated([]);
  }, [projectId]);

  const { data: fetched, isFetching } = useQuery({
    queryKey: ["tasks", "project", projectId, "done", page],
    queryFn: async () => {
      const res = await client.task.list({
        projectId,
        status: "done",
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      return res.tasks;
    },
    enabled: open,
  });

  // Append each new page into accumulated list
  useEffect(() => {
    if (!fetched) return;
    setAccumulated((prev) => {
      const existingIds = new Set(prev.map((task) => task.id));
      const newItems = fetched.filter((task) => !existingIds.has(task.id));
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, [fetched]);
  /* oxlint-enable react-hooks/set-state-in-effect */

  const hasMore = (fetched?.length ?? 0) === PAGE_SIZE;

  return (
    <Section
      title={t("tasks.done.title")}
      count={
        accumulated.length > 0
          ? `${String(accumulated.length)}${hasMore ? "+" : ""}`
          : undefined
      }
      isOpen={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-2">
        {accumulated.length > 0 && (
          <ul className="space-y-2">
            {accumulated.map((task) => (
              <li key={task.id}>
                <TaskListCard
                  task={task}
                  allLabels={allLabels}
                  onReopened={() =>
                    setAccumulated((prev) =>
                      prev.filter((other) => other.id !== task.id),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {isFetching && <Loader size={24} label={t("loading")} />}
        {!isFetching && hasMore && (
          <Button
            variant="quiet"
            size="sm"
            onPress={() => setPage((p) => p + 1)}
          >
            {t("tasks.done.loadMore")}
          </Button>
        )}
        {!isFetching && accumulated.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {t("tasks.done.none")}
          </p>
        )}
      </div>
    </Section>
  );
}

function ProjectTaskPage() {
  const { t } = useTranslation();
  const { projectId: projectIdStr } = useParams({ from: "/tasks/$projectId" });
  const projectId = parseInt(projectIdStr, 10);
  const queryClient = useQueryClient();
  const { openProject } = useDetailDrawer();

  const [adding, setAdding] = useState<TaskType | null>(null);
  const [open, setOpen] = useState({ task: true, activity: true });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      const res = await client.project.get({ id: projectId });
      return res.project;
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "project", projectId],
    queryFn: async () => {
      const res = await client.task.list({
        projectId,
        includeStatuses: ["open"],
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

  const createTaskMutation = useMutation({
    mutationFn: ({ name, taskType }: { name: string; taskType: TaskType }) =>
      client.task.create({ projectId, name, taskType }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  if (projectLoading || tasksLoading) {
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

  const byType = {
    task: tasks.filter((task) => task.taskType === "task"),
    activity: tasks.filter((task) => task.taskType === "activity"),
  };

  function renderSection(type: TaskType) {
    const isTask = type === "task";
    const list = byType[type];
    return (
      <Section
        title={isTask ? t("tasks.title") : t("tasks.activities")}
        count={String(list.length)}
        isOpen={open[type]}
        onOpenChange={(isOpen) => setOpen((o) => ({ ...o, [type]: isOpen }))}
        action={
          adding !== type && (
            <Button
              variant="quiet"
              size="sm"
              onPress={() => {
                setOpen((o) => ({ ...o, [type]: true }));
                setAdding(type);
              }}
            >
              <Plus aria-hidden />
              {isTask ? t("tasks.newTask") : t("tasks.newActivity")}
            </Button>
          )
        }
      >
        <div className="space-y-2">
          {adding === type && (
            <NewTaskForm
              label={
                isTask ? t("tasks.newTaskName") : t("tasks.newActivityName")
              }
              onClose={() => setAdding(null)}
              onCreate={(name) =>
                createTaskMutation.mutate({ name, taskType: type })
              }
            />
          )}
          <TaskList
            tasks={list}
            allLabels={allLabels}
            empty={isTask ? t("tasks.noTasks") : t("tasks.noActivities")}
          />
        </div>
      </Section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="flex min-w-0 items-center gap-3">
          {project && <ProjectDot color={project.color} className="size-3" />}
          <h1 className="text-display text-foreground min-w-0 [overflow-wrap:anywhere]">
            {project?.name ?? t("drawer.project")}
          </h1>
          {project && (
            <Button
              variant="quiet"
              size="sm"
              onPress={() => openProject(project.id)}
              aria-label={t("tasks.openProject")}
              className="text-muted-foreground shrink-0"
            >
              <Settings2 aria-hidden />
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("tasks.openCount", { count: byType.task.length })} ·{" "}
          {t("tasks.activityCount", { count: byType.activity.length })}
        </p>
      </header>

      {renderSection("task")}
      {renderSection("activity")}
      <DoneTasksSection projectId={projectId} allLabels={allLabels} />
    </div>
  );
}

export const Route = createFileRoute("/tasks/$projectId")({
  component: ProjectTaskPage,
});
