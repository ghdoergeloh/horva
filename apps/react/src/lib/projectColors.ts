// Project colors are data: the user picks one per project, and slots and
// charts show it. They are the only raw colors of the app besides the icon.

/** The colors offered when a project is created or edited. */
export const PROJECT_COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#64748b",
] as const;

/** The color of a new project. */
export const DEFAULT_PROJECT_COLOR = PROJECT_COLOR_PRESETS[0];

/** A slot without a task, and so without a project color. */
export const NO_PROJECT_COLOR = "#9ca3af";

/** A slot whose task was deleted. */
export const DELETED_TASK_COLOR = "#d1d5db";
