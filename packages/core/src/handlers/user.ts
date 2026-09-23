import type { HandlerArgs } from "./types";
import { greet } from "../services/greeting.service";

export function me({ context }: HandlerArgs) {
  if (!context.session) return { user: null };
  const { id, email, name } = context.session.user;
  return { user: { id, email, name } };
}

export function hello({ context }: HandlerArgs) {
  return { message: greet(context.session?.user.name) };
}
