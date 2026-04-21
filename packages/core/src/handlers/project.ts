import type { HandlerArgs } from "./types";
import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../services/project.service";

interface ListInput {
  includeArchived?: boolean;
}

export async function list({ input, context }: HandlerArgs<ListInput>) {
  const projects = await listProjects(context.db, input.includeArchived);
  return { projects };
}

interface IdInput {
  id: number;
}

export async function get({ input, context }: HandlerArgs<IdInput>) {
  const project = await getProject(context.db, input.id);
  return { project: project ?? null };
}

interface CreateInput {
  name: string;
  color?: string;
}

export async function create({ input, context }: HandlerArgs<CreateInput>) {
  const project = await createProject(context.db, {
    name: input.name,
    color: input.color ?? "#6366f1",
  });
  return { project };
}

interface UpdateInput {
  id: number;
  name?: string;
  color?: string;
}

export async function update({ input, context }: HandlerArgs<UpdateInput>) {
  const { id, ...rest } = input;
  const project = await updateProject(context.db, id, rest);
  return { project };
}

export async function archive({ input, context }: HandlerArgs<IdInput>) {
  const project = await archiveProject(context.db, input.id);
  return { project };
}

async function deleteHandler({ input, context }: HandlerArgs<IdInput>) {
  await deleteProject(context.db, input.id);
  return { ok: true };
}
export { deleteHandler as delete };
