import type { HandlerArgs } from "./types";
import {
  assignTaskToSlot,
  deleteSlot,
  doneSlot,
  editSlot,
  getOpenSlot,
  getSlot,
  insertSlot,
  listSlots,
  splitSlot,
  startSlot,
  stopSlot,
} from "../services/slot.service";

export async function status({ context }: HandlerArgs) {
  const s = await getOpenSlot(context.db);
  return { slot: s ?? null };
}

interface ListInput {
  from: Date;
  to: Date;
  projectId?: number;
  tasksOnly?: boolean;
}

export async function list({ input, context }: HandlerArgs<ListInput>) {
  const slots = await listSlots(context.db, input);
  return { slots };
}

interface StartInput {
  taskId?: number;
  at?: Date;
}

export async function start({ input, context }: HandlerArgs<StartInput>) {
  const result = await startSlot(context.db, input.taskId, input.at);
  const newSlot = await getSlot(context.db, result.newSlot.id);
  if (!newSlot) throw new Error("Slot not found after start");
  const closedSlot = result.closedSlot
    ? await getSlot(context.db, result.closedSlot.id)
    : null;
  return { closedSlot: closedSlot ?? null, newSlot };
}

interface StopInput {
  at?: Date;
}

export async function stop({ input, context }: HandlerArgs<StopInput>) {
  const result = await stopSlot(context.db, input.at);
  const newSlot = result.newSlot
    ? await getSlot(context.db, result.newSlot.id)
    : null;
  const closedSlot = result.closedSlot
    ? await getSlot(context.db, result.closedSlot.id)
    : null;
  return { closedSlot: closedSlot ?? null, newSlot: newSlot ?? null };
}

interface DoneInput {
  at?: Date;
}

export async function done({ input, context }: HandlerArgs<DoneInput>) {
  const result = await doneSlot(context.db, input.at);
  const closedSlot = result.closedSlot
    ? await getSlot(context.db, result.closedSlot.id)
    : null;
  return { closedSlot: closedSlot ?? null };
}

interface AssignInput {
  id: number;
  taskId: number;
}

export async function assign({ input, context }: HandlerArgs<AssignInput>) {
  await assignTaskToSlot(context.db, input.id, input.taskId);
  const slot = await getSlot(context.db, input.id);
  if (!slot) throw new Error("Slot not found after assign");
  return { slot };
}

interface EditInput {
  id: number;
  startedAt?: Date;
  endedAt?: Date | null;
  taskId?: number | null;
}

export async function edit({ input, context }: HandlerArgs<EditInput>) {
  const { id, ...rest } = input;
  return editSlot(context.db, id, rest);
}

interface IdInput {
  id: number;
}

async function deleteHandler({ input, context }: HandlerArgs<IdInput>) {
  await deleteSlot(context.db, input.id);
  return { ok: true };
}
export { deleteHandler as delete };

interface SplitInput {
  id: number;
  at: Date;
}

export async function split({ input, context }: HandlerArgs<SplitInput>) {
  const result = await splitSlot(context.db, input.id, input.at);
  const first = await getSlot(context.db, result.first.id);
  const second = await getSlot(context.db, result.second.id);
  if (!first || !second) throw new Error("Slot not found after split");
  return { first, second };
}

interface InsertInput {
  startedAt: Date;
  endedAt?: Date | null;
  taskId?: number | null;
}

export async function insert({ input, context }: HandlerArgs<InsertInput>) {
  return insertSlot(context.db, input.startedAt, input.endedAt, input.taskId);
}
