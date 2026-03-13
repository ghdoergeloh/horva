import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StartTaskDialogProps {
  switchMode?: boolean;
  onClose: () => void;
  onStarted: () => Promise<void>;
}

interface TaskRow {
  id: number;
  name: string;
  project: { name: string; color: string };
  status: string;
}

export function StartTaskDialog({
  switchMode = false,
  onClose,
  onStarted,
}: StartTaskDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: () =>
      window.api.tasks.list({ status: "open" }) as Promise<TaskRow[]>,
  });

  const filtered = search
    ? tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tasks.slice(0, 10);

  async function startWithTask(taskId: number) {
    await window.api.slots.start(taskId);
    await onStarted();
  }

  async function startWithoutTask() {
    await window.api.slots.start(undefined);
    await onStarted();
  }

  async function createAndStart() {
    if (!newTaskName.trim()) return;
    setCreating(true);
    try {
      const task = (await window.api.tasks.create({
        name: newTaskName.trim(),
      })) as { id: number };
      await startWithTask(task.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {switchMode
              ? t("startTaskDialog.titleSwitch")
              : t("startTaskDialog.titleStart")}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("startTaskDialog.searchPlaceholder")}
              className="flex-1 text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Task list */}
        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.map((task) => (
            <button
              key={task.id}
              onClick={() => void startWithTask(task.id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
            >
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="flex-1 truncate text-sm text-gray-900">
                {task.name}
              </span>
              <span className="flex-shrink-0 text-xs text-gray-400">
                {task.project.name}
              </span>
            </button>
          ))}
          {filtered.length === 0 && search && (
            <p className="px-4 py-3 text-sm text-gray-400">
              {t("startTaskDialog.noTaskFound")}
            </p>
          )}
        </div>

        {/* Create new task */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <Plus className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createAndStart();
                }}
                placeholder={t("startTaskDialog.createPlaceholder")}
                className="flex-1 text-sm outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => void createAndStart()}
              disabled={!newTaskName.trim() || creating}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {t("startTaskDialog.start")}
            </button>
          </div>
        </div>

        {/* Start without task */}
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => void startWithoutTask()}
            className="w-full rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            {t("startTaskDialog.startWithoutTask")}
          </button>
        </div>
      </div>
    </div>
  );
}
