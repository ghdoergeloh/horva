import type { HandlerArgs } from "./types";
import {
  createLabel,
  deleteLabel,
  listLabels,
} from "../services/label.service";

export async function list({ context }: HandlerArgs) {
  const labels = await listLabels(context.db);
  return { labels };
}

interface CreateInput {
  name: string;
}

export async function create({ input, context }: HandlerArgs<CreateInput>) {
  const label = await createLabel(context.db, input.name);
  return { label };
}

interface IdInput {
  id: number;
}

async function deleteHandler({ input, context }: HandlerArgs<IdInput>) {
  const result = await deleteLabel(context.db, input.id);
  return { affectedTasks: result.affectedTasks };
}
export { deleteHandler as delete };
