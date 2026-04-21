import { oc } from "@orpc/contract";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

// Lite shapes embedded inside other records.
const projectLiteSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
});

const labelLiteSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const slotLiteSchema = z.object({
  id: z.number(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
});

// Full flat records.
const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  status: z.enum(["active", "archived", "deleted"]),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const labelSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
});

const taskFlatSchema = z.object({
  id: z.number(),
  name: z.string(),
  projectId: z.number(),
  status: z.enum(["open", "done", "archived", "deleted"]),
  taskType: z.enum(["task", "activity"]),
  scheduledAt: z.date().nullable(),
  recurrenceRule: z.string().nullable(),
  notes: z.string().nullable(),
  links: z.array(z.string()),
  priority: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  doneAt: z.date().nullable(),
  archivedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
});

// Rich task: flat fields + joined relations the renderer reads.
// `slots` is included on task listings/fetches for totalMinutes calcs, but is
// deliberately NOT on the nested task inside a slot (to avoid N+1-style bloat).
const taskSchema = taskFlatSchema.extend({
  project: projectLiteSchema,
  taskLabels: z.array(z.object({ label: labelLiteSchema })),
  slots: z.array(slotLiteSchema),
});

// Shape of the task embedded inside a slot response.
const taskInSlotSchema = taskFlatSchema.extend({
  project: projectLiteSchema,
  taskLabels: z.array(z.object({ label: labelLiteSchema })),
});

// Rich slot: flat fields + (optional) joined task.
const slotFlatSchema = z.object({
  id: z.number(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  taskId: z.number().nullable(),
  state: z.enum(["active", "no_task", "task_deleted"]),
  createdAt: z.date(),
});

const slotSchema = slotFlatSchema.extend({
  task: taskInSlotSchema.nullable().optional(),
});

const periodSchema = z.enum(["today", "yesterday", "week", "month", "all"]);

const rangeSchema = z.union([
  z.object({ period: periodSchema }),
  z.object({ from: z.date(), to: z.date() }),
]);

const summaryEntrySchema = z.object({
  projectId: z.number().nullable(),
  projectName: z.string(),
  projectColor: z.string(),
  totalMinutes: z.number(),
  tasks: z.array(
    z.object({
      taskId: z.number(),
      taskName: z.string(),
      minutes: z.number(),
    }),
  ),
});

export const contract = oc.router({
  user: oc.router({
    me: oc
      .route({ method: "GET", path: "/user/me" })
      .output(z.object({ user: userSchema.nullable() })),
    hello: oc
      .route({ method: "GET", path: "/user/hello" })
      .output(z.object({ message: z.string() })),
  }),

  slot: oc.router({
    status: oc
      .route({ method: "GET", path: "/slot/status" })
      .output(z.object({ slot: slotSchema.nullable() })),
    list: oc
      .route({ method: "GET", path: "/slots" })
      .input(
        z.object({
          from: z.date(),
          to: z.date(),
          projectId: z.number().optional(),
          tasksOnly: z.boolean().optional(),
        }),
      )
      .output(z.object({ slots: z.array(slotSchema) })),
    start: oc
      .route({ method: "POST", path: "/slot/start" })
      .input(
        z.object({
          taskId: z.number().optional(),
          at: z.date().optional(),
        }),
      )
      .output(
        z.object({
          closedSlot: slotSchema.nullable(),
          newSlot: slotSchema,
        }),
      ),
    stop: oc
      .route({ method: "POST", path: "/slot/stop" })
      .input(z.object({ at: z.date().optional() }))
      .output(
        z.object({
          closedSlot: slotSchema.nullable(),
          newSlot: slotSchema.nullable(),
        }),
      ),
    done: oc
      .route({ method: "POST", path: "/slot/done" })
      .input(z.object({ at: z.date().optional() }))
      .output(z.object({ closedSlot: slotSchema.nullable() })),
    assign: oc
      .route({ method: "POST", path: "/slot/{id}/assign" })
      .input(z.object({ id: z.number(), taskId: z.number() }))
      .output(z.object({ slot: slotSchema })),
    edit: oc
      .route({ method: "PATCH", path: "/slot/{id}" })
      .input(
        z.object({
          id: z.number(),
          startedAt: z.date().optional(),
          endedAt: z.date().nullable().optional(),
          taskId: z.number().nullable().optional(),
        }),
      )
      .output(
        z.object({
          updated: slotSchema,
          neighborAdjusted: z
            .object({
              id: z.number(),
              field: z.enum(["startedAt", "endedAt"]),
              from: z.date(),
              to: z.date(),
            })
            .optional(),
        }),
      ),
    delete: oc
      .route({ method: "DELETE", path: "/slot/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ ok: z.boolean() })),
    split: oc
      .route({ method: "POST", path: "/slot/{id}/split" })
      .input(z.object({ id: z.number(), at: z.date() }))
      .output(z.object({ first: slotSchema, second: slotSchema })),
    insert: oc
      .route({ method: "POST", path: "/slots/insert" })
      .input(
        z.object({
          startedAt: z.date(),
          endedAt: z.date().nullable().optional(),
          taskId: z.number().nullable().optional(),
        }),
      )
      .output(
        z.object({
          inserted: slotSchema,
          neighborAdjusted: z
            .object({
              id: z.number(),
              field: z.enum(["startedAt", "endedAt"]),
              from: z.date(),
              to: z.date(),
            })
            .optional(),
        }),
      ),
  }),

  task: oc.router({
    list: oc
      .route({ method: "GET", path: "/tasks" })
      .input(
        z.object({
          projectId: z.number().optional(),
          status: z.enum(["open", "done", "archived", "deleted"]).optional(),
          includeStatuses: z
            .array(z.enum(["open", "done", "archived", "deleted"]))
            .optional(),
          includeAll: z.boolean().optional(),
          taskType: z.enum(["task", "activity"]).optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }),
      )
      .output(z.object({ tasks: z.array(taskSchema) })),
    get: oc
      .route({ method: "GET", path: "/tasks/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ task: taskSchema.nullable() })),
    create: oc
      .route({ method: "POST", path: "/tasks" })
      .input(
        z.object({
          name: z.string().min(1),
          projectId: z.number().optional(),
          taskType: z.enum(["task", "activity"]).optional(),
          labelIds: z.array(z.number()).optional(),
          scheduledAt: z.date().optional(),
          recurrenceRule: z.string().optional(),
          notes: z.string().optional(),
          links: z.array(z.string()).optional(),
        }),
      )
      .output(z.object({ task: taskSchema })),
    update: oc
      .route({ method: "PATCH", path: "/tasks/{id}" })
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          projectId: z.number().optional(),
          taskType: z.enum(["task", "activity"]).optional(),
          addLabelIds: z.array(z.number()).optional(),
          removeLabelIds: z.array(z.number()).optional(),
          scheduledAt: z.date().nullable().optional(),
          recurrenceRule: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          addLinks: z.array(z.string()).optional(),
          removeLinks: z.array(z.string()).optional(),
        }),
      )
      .output(z.object({ task: taskSchema })),
    done: oc
      .route({ method: "POST", path: "/tasks/{id}/done" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ task: taskSchema })),
    reopen: oc
      .route({ method: "POST", path: "/tasks/{id}/reopen" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ task: taskSchema })),
    archive: oc
      .route({ method: "POST", path: "/tasks/{id}/archive" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ task: taskSchema })),
    delete: oc
      .route({ method: "DELETE", path: "/tasks/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ affectedSlots: z.number() })),
    plan: oc
      .route({ method: "POST", path: "/tasks/{id}/plan" })
      .input(
        z.object({
          id: z.number(),
          date: z.date().nullable(),
        }),
      )
      .output(z.object({ task: taskSchema })),
    reorder: oc
      .route({ method: "POST", path: "/tasks/reorder" })
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .output(z.object({ ok: z.boolean() })),
  }),

  project: oc.router({
    list: oc
      .route({ method: "GET", path: "/projects" })
      .input(z.object({ includeArchived: z.boolean().optional() }))
      .output(z.object({ projects: z.array(projectSchema) })),
    get: oc
      .route({ method: "GET", path: "/projects/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ project: projectSchema.nullable() })),
    create: oc
      .route({ method: "POST", path: "/projects" })
      .input(
        z.object({
          name: z.string().min(1),
          color: z.string().optional(),
        }),
      )
      .output(z.object({ project: projectSchema })),
    update: oc
      .route({ method: "PATCH", path: "/projects/{id}" })
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          color: z.string().optional(),
        }),
      )
      .output(z.object({ project: projectSchema })),
    archive: oc
      .route({ method: "POST", path: "/projects/{id}/archive" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ project: projectSchema })),
    delete: oc
      .route({ method: "DELETE", path: "/projects/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ ok: z.boolean() })),
  }),

  label: oc.router({
    list: oc
      .route({ method: "GET", path: "/labels" })
      .output(z.object({ labels: z.array(labelSchema) })),
    create: oc
      .route({ method: "POST", path: "/labels" })
      .input(z.object({ name: z.string().min(1) }))
      .output(z.object({ label: labelSchema })),
    delete: oc
      .route({ method: "DELETE", path: "/labels/{id}" })
      .input(z.object({ id: z.number() }))
      .output(z.object({ affectedTasks: z.number() })),
  }),

  log: oc.router({
    entries: oc
      .route({ method: "GET", path: "/log" })
      .input(rangeSchema.optional())
      .output(z.object({ slots: z.array(slotSchema) })),
    summary: oc
      .route({ method: "GET", path: "/log/summary" })
      .input(rangeSchema.optional())
      .output(z.object({ summary: z.array(summaryEntrySchema) })),
  }),
});

export type Contract = typeof contract;
