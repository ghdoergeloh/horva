import type { TFunction } from "i18next";
import { useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { TaskPickerKey, TaskPickerLabels } from "@horva/ui/TaskPicker";
import { Button } from "@horva/ui/Button";
import { Dialog } from "@horva/ui/Dialog";
import { Loader } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";
import { TaskPickerPanel } from "@horva/ui/TaskPicker";

import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import { calcTotalMinutes } from "#/lib/taskUtils.js";
import { lastUsedProjectId, nextProjectColor } from "./timerRules.js";

interface StartTaskDialogProps {
  isOpen: boolean;
  /** "Switch task" instead of "Start work". */
  switchMode?: boolean;
  /**
   * What runs now: a task id, `null` for a slot without a task, `undefined`
   * when nothing runs. The picker marks it, and picking it changes nothing.
   */
  current?: number | null;
  onClose: () => void;
  onStarted: () => Promise<void>;
}

/** The texts of the task picker in the language of the app. */
function taskPickerLabels(t: TFunction): Partial<TaskPickerLabels> {
  return {
    field: t("taskPicker.field"),
    noTask: t("taskPicker.noTask"),
    unknownTask: t("taskPicker.unknownTask"),
    dialog: t("taskPicker.dialog"),
    search: t("taskPicker.search"),
    list: t("taskPicker.list"),
    noMatchesCreate: t("taskPicker.noMatchesCreate"),
    noMatches: t("taskPicker.noMatches"),
    noTasks: t("taskPicker.noTasks"),
    createIn: t("taskPicker.createIn"),
    createTask: (title, project) =>
      t("taskPicker.createTask", { title, project }),
    changeProject: (project) => t("taskPicker.changeProject", { project }),
    createFailed: t("taskPicker.createFailed"),
    projectPending: t("taskPicker.projectPending"),
    createProjectFailed: t("taskPicker.createProjectFailed"),
    back: t("taskPicker.back"),
    projectFor: t("taskPicker.projectFor"),
    projectSearch: t("taskPicker.projectSearch"),
    projectList: t("taskPicker.projectList"),
    noProjects: t("taskPicker.noProjects"),
    newProject: t("taskPicker.newProject"),
    keyMove: t("taskPicker.keyMove"),
    keyPick: t("taskPicker.keyPick"),
    keyCreate: t("taskPicker.keyCreate"),
    keyClose: t("taskPicker.keyClose"),
  };
}

/**
 * The dialog "Start work" / "Switch task": the task picker with all open
 * tasks, grouped by project. Picking a task starts it; a new task is
 * created in the chosen project and started at once. The dialog gives the
 * focus back to the button that opened it.
 */
export function StartTaskDialog({
  isOpen,
  switchMode = false,
  current,
  onClose,
  onStarted,
}: StartTaskDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Modal
      isDismissable
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog aria-labelledby={titleId} className="flex flex-col p-0">
        <div className="border-border flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
          <h2 id={titleId} className="text-heading text-foreground">
            {switchMode
              ? t("startTaskDialog.titleSwitch")
              : t("startTaskDialog.titleStart")}
          </h2>
          <Button
            variant="quiet"
            size="sm"
            onPress={onClose}
            aria-label={t("startTaskDialog.close")}
          >
            <X aria-hidden />
          </Button>
        </div>
        <StartTaskPanel
          current={current}
          onStarted={onStarted}
          onUnchanged={onClose}
        />
      </Dialog>
    </Modal>
  );
}

/** The picker value when nothing runs: no entry carries the check mark. */
const NOTHING_RUNS = "";

/** The picker inside the dialog, with the data it needs. */
function StartTaskPanel({
  current,
  onStarted,
  onUnchanged,
}: {
  /** What runs now: a task id, `null` for a slot without a task. */
  current: number | null | undefined;
  onStarted: () => Promise<void>;
  onUnchanged: () => void;
}) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  // While a start runs, further picks and creations wait for it, so a second
  // Enter neither starts twice nor creates the task twice.
  const starting = useRef(false);
  const creating = useRef<Promise<number> | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: async () => {
      const res = await client.task.list({ status: "open" });
      return res.tasks;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await client.project.list({});
      return res.projects;
    },
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = projectsQuery.data ?? [];

  const pickerTasks = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        trackedMinutes: calcTotalMinutes(task.slots),
      })),
    [tasks],
  );
  const lastProjectId = useMemo(() => lastUsedProjectId(tasks), [tasks]);

  if (tasksQuery.isError || projectsQuery.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-2 px-4 py-4">
        <p className="text-destructive text-body">
          {t("startTaskDialog.loadFailed")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            void tasksQuery.refetch();
            void projectsQuery.refetch();
          }}
        >
          {t("error.retry")}
        </Button>
      </div>
    );

  if (tasksQuery.isPending || projectsQuery.isPending)
    return (
      <div className="flex justify-center py-8">
        <Loader size={40} label={t("loading")} />
      </div>
    );

  async function start(value: TaskPickerKey | null) {
    if (starting.current) return;
    if (current !== undefined && value === current) {
      onUnchanged();
      return;
    }
    starting.current = true;
    setFailed(false);
    try {
      await client.slot.start(value === null ? {} : { taskId: Number(value) });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["log"] });
      await onStarted();
    } catch {
      setFailed(true);
    } finally {
      starting.current = false;
      creating.current = null;
    }
  }

  function createTask(name: string, projectId: TaskPickerKey) {
    // A second Enter while the new task starts gets the same task.
    creating.current ??= client.task
      .create({ name, projectId: Number(projectId) })
      .then(({ task }) => task.id)
      .catch((error: unknown) => {
        creating.current = null;
        throw error;
      });
    return creating.current;
  }

  async function createProject(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { project } = await client.project.create({
      name: trimmed,
      color: nextProjectColor(projects),
    });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    return project.id;
  }

  return (
    <>
      <TaskPickerPanel
        projects={projects}
        tasks={pickerTasks}
        value={current === undefined ? NOTHING_RUNS : current}
        onChange={(value) => void start(value)}
        onCreateTask={createTask}
        onCreateProject={createProject}
        lastProjectId={lastProjectId}
        formatDuration={(minutes) =>
          formatMinutesWithFormat(minutes, timeFormat)
        }
        labels={taskPickerLabels(t)}
        className="flex-1"
      />
      {failed && (
        <p role="alert" className="text-destructive text-small px-4 pb-3">
          {t("startTaskDialog.failed")}
        </p>
      )}
    </>
  );
}
