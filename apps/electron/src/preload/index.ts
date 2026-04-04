import { contextBridge, ipcRenderer } from "electron";

import type {
  CreateProject,
  CreateTask,
  ListTasksOpts,
  Period,
  UpdateProject,
  UpdateTask,
} from "@timetracker/core";

export type DbChangedScope = "slots" | "tasks" | "all";

const api = {
  slots: {
    getOpen: () => ipcRenderer.invoke("slots:getOpen"),
    start: (taskId?: number, at?: string) =>
      ipcRenderer.invoke("slots:start", taskId, at),
    stop: (at?: string) => ipcRenderer.invoke("slots:stop", at),
    done: (at?: string) => ipcRenderer.invoke("slots:done", at),
    assign: (slotId: number, taskId: number) =>
      ipcRenderer.invoke("slots:assign", slotId, taskId),
    list: (from: string, to: string, projectId?: number) =>
      ipcRenderer.invoke("slots:list", from, to, projectId),
    edit: (
      id: number,
      changes: {
        startedAt?: string;
        endedAt?: string | null;
        taskId?: number | null;
      },
    ) => ipcRenderer.invoke("slots:edit", id, changes),
    delete: (id: number) => ipcRenderer.invoke("slots:delete", id),
    split: (id: number, at: string) =>
      ipcRenderer.invoke("slots:split", id, at),
    insert: (
      startedAt: string,
      endedAt?: string | null,
      taskId?: number | null,
    ) => ipcRenderer.invoke("slots:insert", startedAt, endedAt, taskId),
  },
  tasks: {
    list: (opts?: ListTasksOpts) => ipcRenderer.invoke("tasks:list", opts),
    get: (id: number) => ipcRenderer.invoke("tasks:get", id),
    create: (input: CreateTask) => ipcRenderer.invoke("tasks:create", input),
    update: (id: number, input: UpdateTask) =>
      ipcRenderer.invoke("tasks:update", id, input),
    markDone: (id: number) => ipcRenderer.invoke("tasks:markDone", id),
    reopen: (id: number) => ipcRenderer.invoke("tasks:reopen", id),
    archive: (id: number) => ipcRenderer.invoke("tasks:archive", id),
    delete: (id: number) => ipcRenderer.invoke("tasks:delete", id),
    plan: (id: number, date: string | null) =>
      ipcRenderer.invoke("tasks:plan", id, date),
    setRecurrence: (id: number, rule: string | null) =>
      ipcRenderer.invoke("tasks:setRecurrence", id, rule),
  },
  projects: {
    list: (includeArchived = false) =>
      ipcRenderer.invoke("projects:list", includeArchived),
    get: (id: number) => ipcRenderer.invoke("projects:get", id),
    create: (input: CreateProject) =>
      ipcRenderer.invoke("projects:create", input),
    update: (id: number, input: UpdateProject) =>
      ipcRenderer.invoke("projects:update", id, input),
    archive: (id: number) => ipcRenderer.invoke("projects:archive", id),
    delete: (id: number) => ipcRenderer.invoke("projects:delete", id),
  },
  labels: {
    list: () => ipcRenderer.invoke("labels:list"),
    create: (name: string) => ipcRenderer.invoke("labels:create", name),
    delete: (id: number) => ipcRenderer.invoke("labels:delete", id),
  },
  log: {
    get: (period: Period) => ipcRenderer.invoke("log:get", period),
    getSummary: (period: Period) =>
      ipcRenderer.invoke("log:getSummary", period),
    getRange: (from: string, to: string) =>
      ipcRenderer.invoke("log:getRange", from, to),
    getSummaryRange: (from: string, to: string) =>
      ipcRenderer.invoke("log:getSummaryRange", from, to),
  },
};

const events = {
  onDbChanged: (cb: (scope: DbChangedScope) => void) => {
    const listener = (_: Electron.IpcRendererEvent, scope: DbChangedScope) =>
      cb(scope);
    ipcRenderer.on("db:changed", listener);
    return () => {
      ipcRenderer.off("db:changed", listener);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("events", events);

export type ElectronAPI = typeof api;
export type ElectronEvents = typeof events;
