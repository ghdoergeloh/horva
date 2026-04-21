import type { HandlerArgs } from "./types";
import { getLog, getSummary } from "../services/log.service";

type Period = "today" | "yesterday" | "week" | "month" | "all";

interface PeriodInput {
  period?: Period;
}

export async function entries({ input, context }: HandlerArgs<PeriodInput>) {
  const slots = await getLog(context.db, input.period ?? "today");
  return { slots };
}

export async function summary({ input, context }: HandlerArgs<PeriodInput>) {
  const summary = await getSummary(context.db, input.period ?? "today");
  return { summary };
}
