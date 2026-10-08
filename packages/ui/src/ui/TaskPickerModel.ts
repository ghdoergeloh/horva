import type { ProjectColor } from "./Chip";

/** The id of a task or project, as the app stores it. */
export type TaskPickerKey = string | number;

/** A project the task picker can show and create tasks in. */
export interface TaskPickerProject {
  id: TaskPickerKey;
  name: string;
  /** A stored project color: token name (`project-3`) or hex value. */
  color: ProjectColor | null;
}

/** A task the task picker can show. */
export interface TaskPickerTask {
  id: TaskPickerKey;
  name: string;
  projectId: TaskPickerKey;
  /** The time tracked on the task so far, shown right in the list. */
  trackedMinutes?: number;
}

/** The tasks of one project, as one group of the list. */
export interface TaskGroup {
  project: TaskPickerProject;
  tasks: TaskPickerTask[];
}

/** German sort order for project and task names. */
const collator = new Intl.Collator("de");

const byName = (a: { name: string }, b: { name: string }) =>
  collator.compare(a.name, b.name);

/**
 * Where `query` occurs in `text`, ignoring case, as `[start, end]`; `null`
 * when it does not occur or the query is empty.
 */
export function findMatch(
  text: string,
  query: string,
): [start: number, end: number] | null {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return null;
  const start = text.toLocaleLowerCase("de").indexOf(needle);
  return start < 0 ? null : [start, start + needle.length];
}

/**
 * The tasks grouped by project, projects and tasks sorted by name. With a
 * query, a task stays when its name or its project's name contains the
 * query; a matching project name keeps the whole group. Groups without
 * tasks and tasks of unknown projects are left out.
 */
export function groupTasks(
  projects: readonly TaskPickerProject[],
  tasks: readonly TaskPickerTask[],
  query = "",
): TaskGroup[] {
  const byProject = new Map<TaskPickerKey, TaskPickerTask[]>();
  for (const task of tasks) {
    const list = byProject.get(task.projectId) ?? [];
    list.push(task);
    byProject.set(task.projectId, list);
  }
  const hasQuery = query.trim() !== "";
  return [...projects]
    .sort(byName)
    .map((project) => {
      const all = byProject.get(project.id) ?? [];
      const projectMatches = hasQuery && findMatch(project.name, query) != null;
      const kept =
        !hasQuery || projectMatches
          ? all
          : all.filter((task) => findMatch(task.name, query) != null);
      return { project, tasks: [...kept].sort(byName) };
    })
    .filter((group) => group.tasks.length > 0);
}

/** The projects whose name contains the query, sorted by name. */
export function filterProjects(
  projects: readonly TaskPickerProject[],
  query = "",
): TaskPickerProject[] {
  const hasQuery = query.trim() !== "";
  return projects
    .filter((project) => !hasQuery || findMatch(project.name, query) != null)
    .sort(byName);
}

/**
 * The project a new task goes into unless the user picks one: the first
 * project whose name matches the query, else the last used project, else
 * the first project by name. `undefined` when there are no projects.
 */
export function suggestProject(
  projects: readonly TaskPickerProject[],
  query: string,
  lastProjectId?: TaskPickerKey | null,
): TaskPickerProject | undefined {
  const sorted = [...projects].sort(byName);
  return (
    sorted.find((project) => findMatch(project.name, query) != null) ??
    sorted.find((project) => project.id === lastProjectId) ??
    sorted[0]
  );
}

/** Minutes as hours and minutes, such as `1:25` or `12:04`. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  return `${hours}:${String(total % 60).padStart(2, "0")}`;
}
