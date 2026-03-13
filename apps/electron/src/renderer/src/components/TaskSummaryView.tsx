import { useTranslation } from "react-i18next";

import { fmtDuration } from "~/lib/timeFormatters.js";

interface SlotRow {
  endedAt: Date | string | null;
  startedAt: Date | string;
  taskId: number | null;
  state: string;
  task?: {
    name: string;
    project: { name: string; color: string };
  } | null;
}

interface TaskEntry {
  taskId: number | null;
  taskName: string;
  ms: number;
}

interface ProjectEntry {
  projectName: string;
  color: string;
  tasks: TaskEntry[];
  totalMs: number;
}

export function TaskSummaryView({ slots }: { slots: SlotRow[] }) {
  const { t } = useTranslation();
  const projectMap = new Map<string, ProjectEntry>();

  for (const slot of slots) {
    if (!slot.endedAt) continue;
    const ms =
      new Date(slot.endedAt).getTime() - new Date(slot.startedAt).getTime();
    const projectName =
      slot.task?.project.name ?? t("taskSummaryView.noProject");
    const color = slot.task?.project.color ?? "#9ca3af";
    const taskName =
      slot.task?.name ??
      (slot.state === "no_task"
        ? t("taskSummaryView.noTask")
        : t("taskSummaryView.deletedTask"));
    const taskId = slot.taskId;

    let proj = projectMap.get(projectName);
    if (!proj) {
      proj = { projectName, color, tasks: [], totalMs: 0 };
      projectMap.set(projectName, proj);
    }
    proj.totalMs += ms;

    const existing = proj.tasks.find((t) => t.taskId === taskId);
    if (existing) {
      existing.ms += ms;
    } else {
      proj.tasks.push({ taskId, taskName, ms });
    }
  }

  const projects = Array.from(projectMap.values()).sort(
    (a, b) => b.totalMs - a.totalMs,
  );

  if (projects.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-gray-300">
        {t("taskSummaryView.noEntries")}
      </p>
    );
  }

  return (
    <div className="space-y-3 px-3 py-1">
      {projects.map((proj) => (
        <div key={proj.projectName}>
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: proj.color }}
            />
            <span className="flex-1 text-sm font-medium text-gray-700">
              {proj.projectName}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {fmtDuration(proj.totalMs)}
            </span>
          </div>
          <div className="space-y-0.5 pl-4">
            {proj.tasks
              .sort((a, b) => b.ms - a.ms)
              .map((task) => (
                <div
                  key={task.taskId ?? "no_task"}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 text-sm text-gray-600">
                    {task.taskName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {fmtDuration(task.ms)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
