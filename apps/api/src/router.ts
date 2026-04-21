import { implement } from "@orpc/server";

import { auth } from "@horva/auth/auth";
import { contract } from "@horva/contract";
import {
  archiveProject,
  archiveTask,
  createLabel,
  createProject,
  createTask,
  deleteLabel,
  deleteProject,
  deleteTask,
  doneSlot,
  editSlot,
  getLog,
  getOpenSlot,
  getProject,
  getSummary,
  getTask,
  listLabels,
  listProjects,
  listTasks,
  markTaskDone,
  planTask,
  reopenTask,
  startSlot,
  stopSlot,
  updateProject,
  updateTask,
} from "@horva/core";
import { db } from "@horva/db/client";

const base = implement(contract).$context<{ request: Request }>();

const authMiddleware = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return next({ context: { session } });
});

const authed = base.use(authMiddleware);

function serializeDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

function serializeProject(p: Awaited<ReturnType<typeof getProject>>) {
  if (!p) return null;
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: serializeDate(p.deletedAt),
  };
}

function serializeTask(t: NonNullable<Awaited<ReturnType<typeof getTask>>>) {
  return {
    ...t,
    scheduledAt: serializeDate(t.scheduledAt),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    doneAt: serializeDate(t.doneAt),
    archivedAt: serializeDate(t.archivedAt),
    deletedAt: serializeDate(t.deletedAt),
  };
}

function serializeSlot(
  s: NonNullable<Awaited<ReturnType<typeof getOpenSlot>>>,
) {
  return {
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: serializeDate(s.endedAt),
    taskId: s.taskId ?? null,
    state: s.state,
    createdAt: s.createdAt.toISOString(),
  };
}

export const router = base.router({
  user: {
    me: authed.user.me.handler(({ context }) => {
      if (!context.session) {
        return { user: null };
      }
      return {
        user: {
          id: context.session.user.id,
          email: context.session.user.email,
          name: context.session.user.name,
        },
      };
    }),
    hello: authed.user.hello.handler(({ context }) => {
      const name = context.session?.user.name ?? "Guest";
      return { message: `Hello, ${name}!` };
    }),
  },

  slot: {
    status: authed.slot.status.handler(async () => {
      const s = await getOpenSlot(db);
      return { slot: s ? serializeSlot(s) : null };
    }),
    start: authed.slot.start.handler(async ({ input }) => {
      const result = await startSlot(
        db,
        input.taskId,
        input.at ? new Date(input.at) : undefined,
      );
      return {
        closedSlot: result.closedSlot
          ? serializeSlot(
              result.closedSlot as Parameters<typeof serializeSlot>[0],
            )
          : null,
        newSlot: serializeSlot(
          result.newSlot as Parameters<typeof serializeSlot>[0],
        ),
      };
    }),
    stop: authed.slot.stop.handler(async ({ input }) => {
      const result = await stopSlot(
        db,
        input.at ? new Date(input.at) : undefined,
      );
      return {
        closedSlot: result.closedSlot
          ? serializeSlot(
              result.closedSlot as Parameters<typeof serializeSlot>[0],
            )
          : null,
        newSlot: result.newSlot
          ? serializeSlot(result.newSlot as Parameters<typeof serializeSlot>[0])
          : null,
      };
    }),
    done: authed.slot.done.handler(async ({ input }) => {
      const result = await doneSlot(
        db,
        input.at ? new Date(input.at) : undefined,
      );
      return {
        closedSlot: result.closedSlot
          ? serializeSlot(
              result.closedSlot as Parameters<typeof serializeSlot>[0],
            )
          : null,
      };
    }),
    edit: authed.slot.edit.handler(async ({ input }) => {
      const { id, ...rest } = input;
      const result = await editSlot(db, id, {
        startedAt: rest.startedAt ? new Date(rest.startedAt) : undefined,
        endedAt:
          rest.endedAt !== undefined
            ? rest.endedAt
              ? new Date(rest.endedAt)
              : null
            : undefined,
        taskId: rest.taskId,
      });
      return {
        updated: serializeSlot(
          result.updated as Parameters<typeof serializeSlot>[0],
        ),
        neighborAdjusted: result.neighborAdjusted
          ? {
              id: result.neighborAdjusted.id,
              field: result.neighborAdjusted.field,
              from: result.neighborAdjusted.from.toISOString(),
              to: result.neighborAdjusted.to.toISOString(),
            }
          : undefined,
      };
    }),
  },

  task: {
    list: authed.task.list.handler(async ({ input }) => {
      const tasks = await listTasks(db, {
        projectId: input.projectId,
        status: input.status,
        includeStatuses: input.includeAll
          ? ["open", "done", "archived"]
          : undefined,
      });
      return { tasks: tasks.map(serializeTask) };
    }),
    get: authed.task.get.handler(async ({ input }) => {
      const t = await getTask(db, input.id);
      return { task: t ? serializeTask(t) : null };
    }),
    create: authed.task.create.handler(async ({ input }) => {
      const t = await createTask(db, {
        name: input.name,
        projectId: input.projectId,
        taskType: input.taskType,
        labelIds: input.labelIds,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : undefined,
        recurrenceRule: input.recurrenceRule,
        notes: input.notes,
        links: input.links,
      });
      const full = await getTask(db, t.id);
      if (!full) throw new Error("Task not found after create");
      return { task: serializeTask(full) };
    }),
    update: authed.task.update.handler(async ({ input }) => {
      const { id, taskType, ...rest } = input;
      await updateTask(db, id, {
        ...rest,
        taskType,
        scheduledAt:
          rest.scheduledAt !== undefined
            ? rest.scheduledAt
              ? new Date(rest.scheduledAt)
              : null
            : undefined,
        recurrenceRule: rest.recurrenceRule,
      });
      const full = await getTask(db, id);
      if (!full) throw new Error("Task not found after update");
      return { task: serializeTask(full) };
    }),
    done: authed.task.done.handler(async ({ input }) => {
      const t = await markTaskDone(db, input.id);
      const full = await getTask(db, t.id);
      if (!full) throw new Error("Task not found after done");
      return { task: serializeTask(full) };
    }),
    reopen: authed.task.reopen.handler(async ({ input }) => {
      const t = await reopenTask(db, input.id);
      const full = await getTask(db, t.id);
      if (!full) throw new Error("Task not found after reopen");
      return { task: serializeTask(full) };
    }),
    archive: authed.task.archive.handler(async ({ input }) => {
      const t = await archiveTask(db, input.id);
      const full = await getTask(db, t.id);
      if (!full) throw new Error("Task not found after archive");
      return { task: serializeTask(full) };
    }),
    delete: authed.task.delete.handler(async ({ input }) => {
      const result = await deleteTask(db, input.id);
      return { affectedSlots: result.affectedSlots };
    }),
    plan: authed.task.plan.handler(async ({ input }) => {
      const t = await planTask(
        db,
        input.id,
        input.date ? new Date(input.date) : null,
      );
      const full = await getTask(db, t.id);
      if (!full) throw new Error("Task not found after plan");
      return { task: serializeTask(full) };
    }),
  },

  project: {
    list: authed.project.list.handler(async ({ input }) => {
      const projects = await listProjects(db, input.includeArchived);
      return {
        projects: projects.map((p) => {
          const serialized = serializeProject(p);
          if (!serialized) throw new Error("Project serialization failed");
          return serialized;
        }),
      };
    }),
    get: authed.project.get.handler(async ({ input }) => {
      const p = await getProject(db, input.id);
      return { project: serializeProject(p) };
    }),
    create: authed.project.create.handler(async ({ input }) => {
      const p = await createProject(db, {
        name: input.name,
        color: input.color ?? "#6366f1",
      });
      const serialized = serializeProject(p);
      if (!serialized) throw new Error("Project not found after create");
      return { project: serialized };
    }),
    update: authed.project.update.handler(async ({ input }) => {
      const { id, ...rest } = input;
      const p = await updateProject(db, id, rest);
      const serialized = serializeProject(p);
      if (!serialized) throw new Error("Project not found after update");
      return { project: serialized };
    }),
    archive: authed.project.archive.handler(async ({ input }) => {
      const p = await archiveProject(db, input.id);
      const serialized = serializeProject(p);
      if (!serialized) throw new Error("Project not found after archive");
      return { project: serialized };
    }),
    delete: authed.project.delete.handler(async ({ input }) => {
      await deleteProject(db, input.id);
      return { ok: true };
    }),
  },

  label: {
    list: authed.label.list.handler(async () => {
      const labels = await listLabels(db);
      return {
        labels: labels.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        })),
      };
    }),
    create: authed.label.create.handler(async ({ input }) => {
      const l = await createLabel(db, input.name);
      return { label: { ...l, createdAt: l.createdAt.toISOString() } };
    }),
    delete: authed.label.delete.handler(async ({ input }) => {
      const result = await deleteLabel(db, input.id);
      return { affectedTasks: result.affectedTasks };
    }),
  },

  log: {
    entries: authed.log.entries.handler(async ({ input }) => {
      const slots = await getLog(db, input.period ?? "today");
      return {
        slots: slots.map((s) => ({
          id: s.id,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt ? s.endedAt.toISOString() : null,
          taskId: s.taskId ?? null,
          state: s.state,
          createdAt: s.createdAt.toISOString(),
        })),
      };
    }),
    summary: authed.log.summary.handler(async ({ input }) => {
      const summary = await getSummary(db, input.period ?? "today");
      return { summary };
    }),
  },
});

export type Router = typeof router;
