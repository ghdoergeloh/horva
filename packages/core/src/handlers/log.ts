import type { Period } from "../services/log.service";
import type { HandlerArgs } from "./types";
import { getLog, getSummary } from "../services/log.service";
import { getWorkPeriods } from "../services/work-period.service";

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

export async function workPeriods({
  input,
  context,
}: HandlerArgs<{ from: Date; to: Date }>) {
  const periods = await getWorkPeriods(context.db, input);
  return { periods };
}
