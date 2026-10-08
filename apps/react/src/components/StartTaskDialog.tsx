import type { TFunction } from "i18next";
import { useId, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { TaskPickerKey, TaskPickerLabels } from "@horva/ui/TaskPicker";
import { Button } from "@horva/ui/Button";
import { Dialog } from "@horva/ui/Dialog";
import { Modal } from "@horva/ui/Modal";
import { TaskPickerPanel } from "@horva/ui/TaskPicker";

import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import { calcTotalMinutes } from "#/lib/taskUtils.js";

interface StartTaskDialogProps {
  isOpen: boolean;
  /** "Switch task" instead of "Start work". */
  switchMode?: boolean;
  /** The task that runs now; the picker marks it. */
  currentTaskId?: number | null;
  onClose: () => void;
  onStarted: () => Promise<void>;
}

/** The texts of the task picker in the language of the app. */
export function taskPickerLabels(t: TFunction): Partial<TaskPickerLabels> {
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
  currentTaskId = null,
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
      <Dialog aria-labelledby={titleId} className="p-0">
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
          currentTaskId={switchMode ? currentTaskId : null}
          onStarted={onStarted}
          onUnchanged={onClose}
        />
      </Dialog>
    </Modal>
  );
}

/** The picker inside the dialog, with the data it needs. */
function StartTaskPanel({
  currentTaskId,
  onStarted,
  onUnchanged,
}: {
  currentTaskId: number | null;
  onStarted: () => Promise<void>;
  onUnchanged: () => void;
}) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: async () => {
      const res = await client.task.list({ status: "open" });
      return res.tasks;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await client.project.list({});
      return res.projects;
    },
  });

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

  // The project of the task that was started last.
  const lastProjectId = useMemo(() => {
    let latest: { at: number; projectId: number } | null = null;
    for (const task of tasks)
      for (const slot of task.slots) {
        const at = new Date(slot.startedAt).getTime();
        if (!latest || at > latest.at)
          latest = { at, projectId: task.projectId };
      }
    return latest?.projectId ?? null;
  }, [tasks]);

  async function start(value: TaskPickerKey | null) {
    if (value !== null && value === currentTaskId) {
      onUnchanged();
      return;
    }
    setFailed(false);
    try {
      await client.slot.start(value === null ? {} : { taskId: Number(value) });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["log"] });
      await onStarted();
    } catch {
      setFailed(true);
    }
  }

  async function createTask(name: string, projectId: TaskPickerKey) {
    const { task } = await client.task.create({
      name,
      projectId: Number(projectId),
    });
    return task.id;
  }

  async function createProject(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { project } = await client.project.create({ name: trimmed });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    return project.id;
  }

  return (
    <>
      <TaskPickerPanel
        projects={projects}
        tasks={pickerTasks}
        value={currentTaskId}
        onChange={(value) => void start(value)}
        onCreateTask={createTask}
        onCreateProject={createProject}
        lastProjectId={lastProjectId}
        formatDuration={(minutes) =>
          formatMinutesWithFormat(minutes, timeFormat)
        }
        labels={taskPickerLabels(t)}
      />
      {failed && (
        <p role="alert" className="text-destructive text-small px-4 pb-3">
          {t("startTaskDialog.failed")}
        </p>
      )}
    </>
  );
}
