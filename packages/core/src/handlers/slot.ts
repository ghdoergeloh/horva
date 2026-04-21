import type { HandlerArgs } from "./types";
import {
  doneSlot,
  editSlot,
  getOpenSlot,
  startSlot,
  stopSlot,
} from "../services/slot.service";

export async function status({ context }: HandlerArgs) {
  const s = await getOpenSlot(context.db);
  return { slot: s ?? null };
}

interface StartInput {
  taskId?: number;
  at?: Date;
}

export async function start({ input, context }: HandlerArgs<StartInput>) {
  return startSlot(context.db, input.taskId, input.at);
}

interface StopInput {
  at?: Date;
}

export async function stop({ input, context }: HandlerArgs<StopInput>) {
  return stopSlot(context.db, input.at);
}

interface DoneInput {
  at?: Date;
}

export async function done({ input, context }: HandlerArgs<DoneInput>) {
  return doneSlot(context.db, input.at);
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
