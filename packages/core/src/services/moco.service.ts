import type { Db } from "@horva/db/client";
import { eq } from "@horva/db";
import { project, taskMocoMapping } from "@horva/db/schema";

import type { MocoConfig } from "../config/config.js";
import type { MocoProject } from "../lib/moco-client.js";
import { getMocoConfig } from "../config/config.js";
import { createActivity, listAssignedProjects } from "../lib/moco-client.js";
import { getLog } from "./log.service.js";

export type SyncSkipReason =
  | "no_task" // slot has no Horva task assigned
  | "project_not_linked" // Horva project has no Moco project linked
  | "no_task_mapping"; // no override and no project default activity

export interface SyncPreviewLine {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  seconds: number;
  status: "syncable" | "skipped";
  reason?: SyncSkipReason;
  /** Resolved Moco target, present when status === "syncable". */
  mocoProjectId?: number;
  mocoTaskId?: number;
}

export interface SyncResult {
  created: number;
  failed: { line: SyncPreviewLine; error: string }[];
}

/** Local calendar day key (matches the renderer's timeline grouping). */
function localDateStr(d: Date): string {
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Aggregate {
  date: string;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  seconds: number;
  /** Moco linkage carried over from the slot's project, if any. */
  mocoProjectId: number | null;
  mocoDefaultTaskId: number | null;
}

/**
 * Build the per-day, per-task aggregation for a date range and classify each
 * group as syncable or skipped. No network calls — pure DB + mapping logic so
 * it can be unit-tested and shown as a preview before any write to Moco.
 */
export async function buildSyncPreview(
  db: Db,
  range: { from: Date; to: Date },
): Promise<SyncPreviewLine[]> {
  const slots = await getLog(db, range);

  // Per-task Moco overrides: taskId -> mocoTaskId.
  const overrides = await db.query.taskMocoMapping.findMany();
  const overrideByTask = new Map(
    overrides.map((o) => [o.taskId, o.mocoTaskId]),
  );

  // Aggregate seconds by (local day, taskId). Task-less slots share a
  // synthetic "no_task" bucket per day.
  const groups = new Map<string, Aggregate>();

  for (const s of slots) {
    if (!s.endedAt) continue;
    const seconds = Math.round(
      (s.endedAt.getTime() - s.startedAt.getTime()) / 1000,
    );
    if (seconds <= 0) continue;

    const date = localDateStr(s.startedAt);
    const taskId = s.task?.id ?? null;
    const key = `${date}|${taskId === null ? "no_task" : String(taskId)}`;

    const existing = groups.get(key);
    if (existing) {
      existing.seconds += seconds;
      continue;
    }

    groups.set(key, {
      date,
      projectId: s.task?.project.id ?? null,
      projectName: s.task?.project.name ?? "",
      taskId,
      taskName: s.task?.name ?? "",
      seconds,
      mocoProjectId: s.task?.project.mocoProjectId ?? null,
      mocoDefaultTaskId: s.task?.project.mocoDefaultTaskId ?? null,
    });
  }

  const lines = Array.from(groups.values()).map((g): SyncPreviewLine => {
    if (g.taskId === null) {
      return { ...toLineBase(g), status: "skipped", reason: "no_task" };
    }
    if (g.mocoProjectId === null) {
      return {
        ...toLineBase(g),
        status: "skipped",
        reason: "project_not_linked",
      };
    }
    const mocoTaskId = overrideByTask.get(g.taskId) ?? g.mocoDefaultTaskId;
    if (mocoTaskId === null) {
      return { ...toLineBase(g), status: "skipped", reason: "no_task_mapping" };
    }
    return {
      ...toLineBase(g),
      status: "syncable",
      mocoProjectId: g.mocoProjectId,
      mocoTaskId,
    };
  });

  // Stable ordering: by date, then project, then task name.
  return lines.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.projectName.localeCompare(b.projectName) ||
      a.taskName.localeCompare(b.taskName),
  );
}

function toLineBase(g: Aggregate) {
  return {
    date: g.date,
    projectId: g.projectId,
    projectName: g.projectName,
    taskId: g.taskId,
    taskName: g.taskName,
    seconds: g.seconds,
  };
}

/**
 * Transfer the syncable lines of a date range to Moco. Recomputes the preview
 * server-side (the client only sends the range) so the write is based on
 * fresh, authoritative data. Each activity is created independently; a single
 * failure does not abort the rest.
 */
export async function runSync(
  db: Db,
  range: { from: Date; to: Date },
): Promise<SyncResult> {
  const cfg = getMocoConfig();
  if (!cfg) throw new Error("Moco is not configured");

  const lines = await buildSyncPreview(db, range);

  const result: SyncResult = { created: 0, failed: [] };

  for (const line of lines) {
    // Only syncable lines carry a resolved Moco target.
    if (
      line.status !== "syncable" ||
      line.mocoProjectId === undefined ||
      line.mocoTaskId === undefined
    ) {
      continue;
    }
    try {
      await createActivity(cfg, {
        date: line.date,
        projectId: line.mocoProjectId,
        taskId: line.mocoTaskId,
        seconds: line.seconds,
        description: line.taskName,
      });
      result.created += 1;
    } catch (err) {
      result.failed.push({
        line,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

// --- Config & linkage helpers -------------------------------------------------

export function getMocoConfigStatus(): {
  configured: boolean;
  subdomain: string | null;
} {
  const cfg = getMocoConfig();
  return { configured: cfg !== null, subdomain: cfg?.subdomain ?? null };
}

/** Validate credentials by loading the assigned projects from Moco. */
export async function fetchRemoteProjects(
  cfg?: MocoConfig,
): Promise<MocoProject[]> {
  const resolved = cfg ?? getMocoConfig();
  if (!resolved) throw new Error("Moco is not configured");
  return listAssignedProjects(resolved);
}

export async function setProjectLink(
  db: Db,
  input: {
    projectId: number;
    mocoProjectId: number | null;
    mocoDefaultTaskId: number | null;
  },
): Promise<void> {
  await db
    .update(project)
    .set({
      mocoProjectId: input.mocoProjectId,
      mocoDefaultTaskId: input.mocoDefaultTaskId,
      updatedAt: new Date(),
    })
    .where(eq(project.id, input.projectId));
}

export async function getTaskMapping(
  db: Db,
  taskId: number,
): Promise<{ mocoTaskId: number | null }> {
  const row = await db.query.taskMocoMapping.findFirst({
    where: eq(taskMocoMapping.taskId, taskId),
  });
  return { mocoTaskId: row?.mocoTaskId ?? null };
}

export async function setTaskMapping(
  db: Db,
  input: { taskId: number; mocoTaskId: number | null },
): Promise<void> {
  if (input.mocoTaskId === null) {
    await db
      .delete(taskMocoMapping)
      .where(eq(taskMocoMapping.taskId, input.taskId));
    return;
  }
  await db
    .insert(taskMocoMapping)
    .values({ taskId: input.taskId, mocoTaskId: input.mocoTaskId })
    .onConflictDoUpdate({
      target: taskMocoMapping.taskId,
      set: { mocoTaskId: input.mocoTaskId },
    });
}
