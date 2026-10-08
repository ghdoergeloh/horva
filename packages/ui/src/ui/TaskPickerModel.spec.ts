import { describe, expect, it } from "vitest";

import type { TaskPickerProject, TaskPickerTask } from "./TaskPickerModel";
import {
  filterProjects,
  findMatch,
  formatMinutes,
  groupTasks,
  suggestProject,
} from "./TaskPickerModel";

const projects: TaskPickerProject[] = [
  { id: 1, name: "Nordlicht", color: "project-2" },
  { id: 2, name: "intern", color: "project-1" },
  { id: 3, name: "Älteste Kunden", color: "project-3" },
  { id: 4, name: "Zebra", color: null },
];

const tasks: TaskPickerTask[] = [
  { id: 10, name: "Kick-Off", projectId: 1 },
  { id: 11, name: "Brain aufsetzen", projectId: 1 },
  { id: 12, name: "Einarbeiten", projectId: 1 },
  { id: 20, name: "Tag planen", projectId: 2 },
  { id: 21, name: "Übersicht", projectId: 2 },
  { id: 22, name: "Abrechnung", projectId: 2 },
  { id: 30, name: "Workshop", projectId: 3 },
  { id: 99, name: "Lost", projectId: 404 },
];

const names = (groups: ReturnType<typeof groupTasks>) =>
  groups.map((g) => [g.project.name, g.tasks.map((t) => t.name)]);

describe("findMatch", () => {
  it("finds the query regardless of case", () => {
    expect(findMatch("Kick-Off", "kick")).toEqual([0, 4]);
    expect(findMatch("Kick-Off", "OFF")).toEqual([5, 8]);
  });

  it("ignores spaces around the query", () => {
    expect(findMatch("Tag planen", "  plan ")).toEqual([4, 8]);
  });

  it("returns null for no match or an empty query", () => {
    expect(findMatch("Kick-Off", "xyz")).toBeNull();
    expect(findMatch("Kick-Off", "  ")).toBeNull();
  });
});

describe("groupTasks", () => {
  it("groups by project and sorts both in German order", () => {
    expect(names(groupTasks(projects, tasks))).toEqual([
      ["Älteste Kunden", ["Workshop"]],
      ["intern", ["Abrechnung", "Tag planen", "Übersicht"]],
      ["Nordlicht", ["Brain aufsetzen", "Einarbeiten", "Kick-Off"]],
    ]);
  });

  it("leaves out projects without tasks and tasks of unknown projects", () => {
    const groups = groupTasks(projects, tasks);
    expect(groups.map((g) => g.project.name)).not.toContain("Zebra");
    expect(groups.flatMap((g) => g.tasks.map((t) => t.id))).not.toContain(99);
  });

  it("keeps tasks whose name or project name matches", () => {
    // "Älteste Kunden" matches by project name, the others by task name.
    expect(names(groupTasks(projects, tasks, "EN"))).toEqual([
      ["Älteste Kunden", ["Workshop"]],
      ["intern", ["Tag planen"]],
      ["Nordlicht", ["Brain aufsetzen", "Einarbeiten"]],
    ]);
  });

  it("keeps the whole group when the project name matches", () => {
    expect(names(groupTasks(projects, tasks, "nord"))).toEqual([
      ["Nordlicht", ["Brain aufsetzen", "Einarbeiten", "Kick-Off"]],
    ]);
  });

  it("returns no groups when nothing matches", () => {
    expect(groupTasks(projects, tasks, "nichts")).toEqual([]);
  });

  it("does not change its input", () => {
    const copy = structuredClone(tasks);
    groupTasks(projects, tasks, "a");
    expect(tasks).toEqual(copy);
  });
});

describe("filterProjects", () => {
  it("sorts all projects without a query", () => {
    expect(filterProjects(projects).map((p) => p.name)).toEqual([
      "Älteste Kunden",
      "intern",
      "Nordlicht",
      "Zebra",
    ]);
  });

  it("keeps the projects that match", () => {
    expect(filterProjects(projects, "E").map((p) => p.name)).toEqual([
      "Älteste Kunden",
      "intern",
      "Zebra",
    ]);
  });
});

describe("suggestProject", () => {
  it("prefers the project that matches the query", () => {
    expect(suggestProject(projects, "nord", 2)?.name).toBe("Nordlicht");
  });

  it("falls back to the last used project", () => {
    expect(suggestProject(projects, "Kick", 2)?.name).toBe("intern");
  });

  it("falls back to the first project by name", () => {
    expect(suggestProject(projects, "Kick")?.name).toBe("Älteste Kunden");
    expect(suggestProject(projects, "", 404)?.name).toBe("Älteste Kunden");
  });

  it("returns undefined without projects", () => {
    expect(suggestProject([], "x")).toBeUndefined();
  });
});

describe("formatMinutes", () => {
  it.each([
    [0, "0:00"],
    [7, "0:07"],
    [85, "1:25"],
    [764, "12:44"],
    [-3, "0:00"],
    [59.6, "1:00"],
  ])("%s minutes are %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});
