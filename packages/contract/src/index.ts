import { oc } from "@orpc/contract";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

// Shared tt schemas (datetime as ISO string for JSON transport)
const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  status: z.enum(["active", "archived", "deleted"]),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

const labelSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

const taskSchema = z.object({
  id: z.number(),
  name: z.string(),
  projectId: z.number(),
  status: z.enum(["open", "done", "archived", "deleted"]),
  taskType: z.enum(["task", "activity"]),
  scheduledDate: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  links: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  doneAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
});

const slotSchema = z.object({
  id: z.number(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  taskId: z.number().nullable(),
  state: z.enum(["active", "no_task", "task_deleted"]),
  createdAt: z.string().datetime(),
});

export const contract = oc.router({
  user: oc.router({
    me: oc
      .route({
        method: "GET",
        path: "/user/me",
      })
      .output(z.object({ user: userSchema.nullable() })),
    hello: oc
      .route({
        method: "GET",
        path: "/user/hello",
      })
      .output(z.object({ message: z.string() })),
  }),

  slot: oc.router({
    status: oc
      .route({ method: "GET", path: "/slot/status" })
      .output(z.object({ slot: slotSchema.nullable() })),
    start: oc
      .route({ method: "POST", path: "/slot/start" })
      .input(
        z.object({
          taskId: z.number().optional(),
          at: z.string().datetime().optional(),
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
      .input(z.object({ at: z.string().datetime().optional() }))
      .output(
        z.object({
          closedSlot: slotSchema.nullable(),
          newSlot: slotSchema.nullable(),
        }),
      ),
    done: oc
      .route({ method: "POST", path: "/slot/done" })
      .input(z.object({ at: z.string().datetime().optional() }))
      .output(z.object({ closedSlot: slotSchema.nullable() })),
    edit: oc
      .route({ method: "PATCH", path: "/slot/{id}" })
      .input(
        z.object({
          id: z.number(),
          startedAt: z.string().datetime().optional(),
          endedAt: z.string().datetime().nullable().optional(),
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
              from: z.string().datetime(),
              to: z.string().datetime(),
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
          includeAll: z.boolean().optional(),
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
          scheduledDate: z.string().datetime().optional(),
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
          scheduledDate: z.string().datetime().nullable().optional(),
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
          date: z.string().datetime().nullable(),
        }),
      )
      .output(z.object({ task: taskSchema })),
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
      .input(
        z.object({
          period: z
            .enum(["today", "yesterday", "week", "month", "all"])
            .optional(),
        }),
      )
      .output(z.object({ slots: z.array(slotSchema) })),
    summary: oc
      .route({ method: "GET", path: "/log/summary" })
      .input(
        z.object({
          period: z
            .enum(["today", "yesterday", "week", "month", "all"])
            .optional(),
        }),
      )
      .output(
        z.object({
          summary: z.array(
            z.object({
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
            }),
          ),
        }),
      ),
  }),
});

export type Contract = typeof contract;
