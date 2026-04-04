import type { KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@timetracker/ui/Button";
import { Select, SelectItem } from "@timetracker/ui/Select";
import { TextField } from "@timetracker/ui/TextField";

import type { LabelRow } from "~/components/TaskEditControls.js";
import { LoadingSpinner } from "~/components/LoadingSpinner.js";
import { TaskCard } from "~/components/TaskCard.js";

interface TaskRow {
  id: number;
  name: string;
  status: string;
  taskType: string;
  scheduledAt: Date | string | null;
  recurrenceRule: string | null;
  project: { id: number; name: string; color: string };
  taskLabels: { label: { id: number; name: string } }[];
  slots: { startedAt: Date | string; endedAt: Date | string | null }[];
}

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

interface CollapsibleSectionProps {
  title: string;
  count: number;
  titleClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  titleClassName = "text-gray-500",
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <Button
        variant="quiet"
        onPress={() => setOpen((v) => !v)}
        className="mb-3 flex items-center gap-1.5 text-left"
        aria-label={title}
      >
        {open ? (
          <ChevronDown className={`h-3.5 w-3.5 ${titleClassName}`} />
        ) : (
          <ChevronRight className={`h-3.5 w-3.5 ${titleClassName}`} />
        )}
        <h2
          className={`text-sm font-semibold tracking-wide uppercase ${titleClassName}`}
        >
          {title}
        </h2>
        <span className="text-xs font-normal tracking-normal text-gray-400 normal-case">
          ({count})
        </span>
      </Button>
      {open && children}
    </section>
  );
}

interface NewTaskFormProps {
  defaultTaskType?: "task" | "activity";
  onClose: () => void;
  onCreate: (name: string, taskType: "task" | "activity") => void;
}

function NewTaskForm({
  defaultTaskType = "task",
  onClose,
  onCreate,
}: NewTaskFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<"task" | "activity">(
    defaultTaskType,
  );

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, taskType);
    onClose();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="flex items-center gap-2 border-t border-gray-100 px-3 py-2"
    >
      <TextField
        autoFocus
        value={name}
        onChange={setName}
        onKeyDown={(e) => handleKeyDown(e)}
        placeholder={t("tasks.newTaskPlaceholder")}
        className="min-w-0 flex-1"
      />
      <Select
        value={taskType}
        onChange={(value) => setTaskType(value as "task" | "activity")}
      >
        <SelectItem id="task">{t("tasks.taskType.task")}</SelectItem>
        <SelectItem id="activity">{t("tasks.taskType.activity")}</SelectItem>
      </Select>
      <Button
        variant="quiet"
        onPress={onClose}
        className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="primary"
        isDisabled={!name.trim()}
        onPress={submit}
        className="flex-shrink-0"
      >
        {t("tasks.create")}
      </Button>
    </div>
  );
}

const PAGE_SIZE = 100;

interface DoneTasksSectionProps {
  projectId: number;
  allLabels: LabelRow[];
  onReopen: (id: number) => void;
}

function DoneTasksSection({
  projectId,
  allLabels,
  onReopen,
}: DoneTasksSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [accumulated, setAccumulated] = useState<TaskRow[]>([]);

  // Reset when navigating to a different project
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOpen(false);
    setPage(0);
    setAccumulated([]);
  }, [projectId]);

  const { data: fetched, isFetching } = useQuery({
    queryKey: ["tasks", "project", projectId, "done", page],
    queryFn: () =>
      window.api.tasks.list({
        projectId,
        status: "done",
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }) as Promise<TaskRow[]>,
    enabled: open,
  });

  // Append each new page into accumulated list
  useEffect(() => {
    if (!fetched) return;
    setAccumulated((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newItems = fetched.filter((t) => !existingIds.has(t.id));
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, [fetched]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const hasMore = (fetched?.length ?? 0) === PAGE_SIZE;

  function handleToggle() {
    setOpen((v) => !v);
  }

  function handleLoadMore() {
    setPage((p) => p + 1);
  }

  return (
    <section>
      <Button
        variant="quiet"
        onPress={handleToggle}
        className="mb-3 flex items-center gap-1.5 text-left"
        aria-label={t("tasks.done.title")}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        )}
        <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
          {t("tasks.done.title")}
        </h2>
        {accumulated.length > 0 && (
          <span className="text-xs font-normal tracking-normal text-gray-400 normal-case">
            ({accumulated.length}
            {hasMore ? "+" : ""})
          </span>
        )}
      </Button>

      {open && (
        <div className="space-y-2">
          {accumulated.map((t) => (
            <TaskCard
              key={t.id}
              id={t.id}
              name={t.name}
              project={t.project}
              labels={t.taskLabels.map((tl) => tl.label)}
              totalMinutes={calcTotalMinutes(t.slots)}
              isActivity={t.taskType === "activity"}
              scheduledAt={t.scheduledAt}
              recurrenceRule={t.recurrenceRule}
              allLabels={allLabels}
              onMarkDone={() => onReopen(t.id)}
            />
          ))}

          {isFetching && (
            <p className="py-1 text-xs text-gray-400">{t("loading")}</p>
          )}

          {!isFetching && hasMore && (
            <Button
              variant="quiet"
              onPress={handleLoadMore}
              className="mt-1 text-xs text-indigo-500 hover:text-indigo-700"
            >
              {t("tasks.done.loadMore")}
            </Button>
          )}

          {!isFetching && accumulated.length === 0 && (
            <p className="text-sm text-gray-400">{t("tasks.done.none")}</p>
          )}
        </div>
      )}
    </section>
  );
}

function ProjectTaskPage() {
  const { t } = useTranslation();
  const { projectId: projectIdStr } = useParams({ from: "/tasks/$projectId" });
  const projectId = parseInt(projectIdStr, 10);
  const queryClient = useQueryClient();

  const [addingTaskType, setAddingTaskType] = useState<
    "task" | "activity" | null
  >(null);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () =>
      window.api.projects.get(projectId) as Promise<{
        id: number;
        name: string;
        color: string;
      }>,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "project", projectId],
    queryFn: () =>
      window.api.tasks.list({
        projectId,
        includeStatuses: ["open"],
      }) as Promise<TaskRow[]>,
  });

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: () => window.api.labels.list() as Promise<LabelRow[]>,
  });

  function invalidateTasks() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const markDoneMutation = useMutation({
    mutationFn: (taskId: number) => window.api.tasks.markDone(taskId),
    onSuccess: invalidateTasks,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      window.api.tasks.update(id, { name }),
    onSuccess: invalidateTasks,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string | null }) =>
      window.api.tasks.plan(id, date),
    onSuccess: invalidateTasks,
  });

  const setRecurrenceMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: string | null }) =>
      window.api.tasks.setRecurrence(id, rule),
    onSuccess: invalidateTasks,
  });

  const addLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      window.api.tasks.update(taskId, { addLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  const removeLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      window.api.tasks.update(taskId, { removeLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  const reopenMutation = useMutation({
    mutationFn: (taskId: number) => window.api.tasks.reopen(taskId),
    onSuccess: invalidateTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: ({
      name,
      taskType,
    }: {
      name: string;
      taskType: "task" | "activity";
    }) => window.api.tasks.create({ projectId, name, taskType }),
    onSuccess: invalidateTasks,
  });

  // Split tasks by type
  const allTasks = tasks.filter((t) => t.taskType === "task");
  const allActivities = tasks.filter((t) => t.taskType === "activity");

  function renderCard(t: TaskRow) {
    const isActivity = t.taskType === "activity";
    return (
      <TaskCard
        key={t.id}
        id={t.id}
        name={t.name}
        project={t.project}
        labels={t.taskLabels.map((tl) => tl.label)}
        totalMinutes={calcTotalMinutes(t.slots)}
        isActivity={isActivity}
        scheduledAt={t.scheduledAt}
        recurrenceRule={t.recurrenceRule}
        onMarkDone={() => markDoneMutation.mutate(t.id)}
        allLabels={allLabels}
        onRename={(name) => renameMutation.mutate({ id: t.id, name })}
        onPlan={(date) => planMutation.mutate({ id: t.id, date })}
        onSetRecurrence={
          isActivity
            ? (rule) => setRecurrenceMutation.mutate({ id: t.id, rule })
            : undefined
        }
        onAddLabel={(labelId) =>
          addLabelMutation.mutate({ taskId: t.id, labelId })
        }
        onRemoveLabel={(labelId) =>
          removeLabelMutation.mutate({ taskId: t.id, labelId })
        }
      />
    );
  }

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  const project = projectData;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-3">
          {project && (
            <div
              className="h-4 w-4 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: project.color }}
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {project?.name ?? "Projekt"}
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {t("tasks.openCount", {
            count: allTasks.filter((t) => t.status === "open").length,
          })}{" "}
          · {t("tasks.activityCount", { count: allActivities.length })}
        </p>
      </div>

      {/* Tasks group */}
      <CollapsibleSection
        title={t("tasks.title")}
        count={allTasks.length}
        titleClassName="text-gray-700"
      >
        <div className="space-y-2">
          {allTasks.map((t) => renderCard(t))}
          {allTasks.length === 0 && addingTaskType !== "task" && (
            <p className="text-sm text-gray-400">{t("tasks.noTasks")}</p>
          )}
        </div>
        {addingTaskType === "task" ? (
          <NewTaskForm
            defaultTaskType="task"
            onClose={() => setAddingTaskType(null)}
            onCreate={(name, taskType) =>
              createTaskMutation.mutate({ name, taskType })
            }
          />
        ) : (
          <Button
            variant="quiet"
            onPress={() => setAddingTaskType("task")}
            className="mt-3 flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("tasks.newTask")}
            </span>
          </Button>
        )}
      </CollapsibleSection>

      {/* Activities group */}
      <CollapsibleSection
        title={t("tasks.activities")}
        count={allActivities.length}
        titleClassName="text-gray-700"
      >
        <div className="space-y-2">
          {allActivities.map((t) => renderCard(t))}
          {allActivities.length === 0 && addingTaskType !== "activity" && (
            <p className="text-sm text-gray-400">{t("tasks.noActivities")}</p>
          )}
        </div>
        {addingTaskType === "activity" ? (
          <NewTaskForm
            defaultTaskType="activity"
            onClose={() => setAddingTaskType(null)}
            onCreate={(name, taskType) =>
              createTaskMutation.mutate({ name, taskType })
            }
          />
        ) : (
          <Button
            variant="quiet"
            onPress={() => setAddingTaskType("activity")}
            className="mt-3 flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("tasks.newActivity")}
            </span>
          </Button>
        )}
      </CollapsibleSection>

      {/* Done tasks — lazy, paginated */}
      <DoneTasksSection
        projectId={projectId}
        allLabels={allLabels}
        onReopen={(id) => reopenMutation.mutate(id)}
      />
    </div>
  );
}

export const Route = createFileRoute("/tasks/$projectId")({
  component: ProjectTaskPage,
});
