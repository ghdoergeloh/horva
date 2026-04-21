import type { HandlerArgs } from "./types";

export function me({ context }: HandlerArgs) {
  if (!context.session) return { user: null };
  return {
    user: {
      id: context.session.user.id,
      email: context.session.user.email,
      name: context.session.user.name,
    },
  };
}

export function hello({ context }: HandlerArgs) {
  const name = context.session?.user.name ?? "Guest";
  return { message: `Hello, ${name}!` };
}
