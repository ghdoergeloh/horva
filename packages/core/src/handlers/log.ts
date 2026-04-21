import type { Period } from "../services/log.service";
import type { HandlerArgs } from "./types";
import { getLog, getSummary } from "../services/log.service";

type RangeInput = { period: Period } | { from: Date; to: Date };

function toRange(
  input: RangeInput | undefined,
): Period | { from: Date; to: Date } {
  if (!input) return "today";
  if ("period" in input) return input.period;
  return input;
}

export async function entries({
  input,
  context,
}: HandlerArgs<RangeInput | undefined>) {
  const slots = await getLog(context.db, toRange(input));
  return { slots };
}

export async function summary({
  input,
  context,
}: HandlerArgs<RangeInput | undefined>) {
  const summary = await getSummary(context.db, toRange(input));
  return { summary };
}
