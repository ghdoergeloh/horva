import type { HandlerArgs } from "./types";
import {
  archiveTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  markTaskDone,
  planTask,
  reopenTask,
  reorderTasks,
  updateTask,
} from "../services/task.service";

interface ListInput {
  projectId?: number;
  status?: "open" | "done" | "archived" | "deleted";
  includeStatuses?: ("open" | "done" | "archived" | "deleted")[];
  includeAll?: boolean;
  taskType?: "task" | "activity";
  limit?: number;
  offset?: number;
}

export async function list({ input, context }: HandlerArgs<ListInput>) {
  const tasks = await listTasks(context.db, {
    projectId: input.projectId,
    status: input.status,
    includeStatuses:
      input.includeStatuses ??
      (input.includeAll ? ["open", "done", "archived"] : undefined),
    taskType: input.taskType,
    limit: input.limit,
    offset: input.offset,
  });
  return { tasks };
}

interface IdInput {
  id: number;
}

export async function get({ input, context }: HandlerArgs<IdInput>) {
  const task = await getTask(context.db, input.id);
  return { task: task ?? null };
}

interface CreateInput {
  name: string;
  projectId?: number;
  taskType?: "task" | "activity";
  labelIds?: number[];
  scheduledAt?: Date;
  recurrenceRule?: string;
  notes?: string;
  links?: string[];
}

export async function create({ input, context }: HandlerArgs<CreateInput>) {
  const created = await createTask(context.db, input);
  const full = await getTask(context.db, created.id);
  if (!full) throw new Error("Task not found after create");
  return { task: full };
}

interface UpdateInput {
  id: number;
  name?: string;
  projectId?: number;
  taskType?: "task" | "activity";
  addLabelIds?: number[];
  removeLabelIds?: number[];
  scheduledAt?: Date | null;
  recurrenceRule?: string | null;
  notes?: string | null;
  addLinks?: string[];
  removeLinks?: string[];
}

export async function update({ input, context }: HandlerArgs<UpdateInput>) {
  const { id, ...rest } = input;
  await updateTask(context.db, id, rest);
  const full = await getTask(context.db, id);
  if (!full) throw new Error("Task not found after update");
  return { task: full };
}

export async function done({ input, context }: HandlerArgs<IdInput>) {
  const t = await markTaskDone(context.db, input.id);
  const full = await getTask(context.db, t.id);
  if (!full) throw new Error("Task not found after done");
  return { task: full };
}

export async function reopen({ input, context }: HandlerArgs<IdInput>) {
  const t = await reopenTask(context.db, input.id);
  const full = await getTask(context.db, t.id);
  if (!full) throw new Error("Task not found after reopen");
  return { task: full };
}

export async function archive({ input, context }: HandlerArgs<IdInput>) {
  const t = await archiveTask(context.db, input.id);
  const full = await getTask(context.db, t.id);
  if (!full) throw new Error("Task not found after archive");
  return { task: full };
}

async function deleteHandler({ input, context }: HandlerArgs<IdInput>) {
  const result = await deleteTask(context.db, input.id);
  return { affectedSlots: result.affectedSlots };
}
export { deleteHandler as delete };

interface PlanInput {
  id: number;
  date: Date | null;
}

export async function plan({ input, context }: HandlerArgs<PlanInput>) {
  const t = await planTask(context.db, input.id, input.date);
  const full = await getTask(context.db, t.id);
  if (!full) throw new Error("Task not found after plan");
  return { task: full };
}

interface ReorderInput {
  orderedIds: number[];
}

export async function reorder({ input, context }: HandlerArgs<ReorderInput>) {
  await reorderTasks(context.db, input.orderedIds);
  return { ok: true };
}
