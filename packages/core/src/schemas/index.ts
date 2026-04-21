import { z } from "zod";

export const projectStatusSchema = z.enum(["active", "archived", "deleted"]);
export const taskStatusSchema = z.enum(["open", "done", "archived", "deleted"]);
export const taskTypeSchema = z.enum(["task", "activity"]);
export const slotStateSchema = z.enum(["active", "no_task", "task_deleted"]);

export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  status: projectStatusSchema,
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const labelSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
});

export const taskSchema = z.object({
  id: z.number(),
  name: z.string(),
  projectId: z.number(),
  status: taskStatusSchema,
  taskType: taskTypeSchema,
  scheduledAt: z.date().nullable(),
  recurrenceRule: z.string().nullable(),
  priority: z.number().nullable(),
  notes: z.string().nullable(),
  links: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  doneAt: z.date().nullable(),
  archivedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
});

export const slotSchema = z.object({
  id: z.number(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  taskId: z.number().nullable(),
  state: slotStateSchema,
  createdAt: z.date(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().default("#6366f1"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export const createTaskSchema = z.object({
  name: z.string().min(1),
  projectId: z.number().optional(),
  taskType: taskTypeSchema.optional(),
  labelIds: z.array(z.number()).optional(),
  scheduledAt: z.date().optional(),
  recurrenceRule: z.string().optional(),
  notes: z.string().optional(),
  links: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1).optional(),
  projectId: z.number().optional(),
  taskType: taskTypeSchema.optional(),
  addLabelIds: z.array(z.number()).optional(),
  removeLabelIds: z.array(z.number()).optional(),
  scheduledAt: z.date().nullable().optional(),
  recurrenceRule: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  addLinks: z.array(z.string()).optional(),
  removeLinks: z.array(z.string()).optional(),
});

export type Project = z.infer<typeof projectSchema>;
export type Label = z.infer<typeof labelSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
