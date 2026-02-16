import { implement } from "@orpc/server";

import { auth } from "@repo/auth/auth";
import { contract } from "@repo/contract";

const base = implement(contract).$context<{ request: Request }>();

const authMiddleware = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  return next({ context: { session } });
});

const authed = base.use(authMiddleware);

export const router = base.router({
  user: {
    me: authed.user.me.handler(({ context }) => {
      if (!context.session) {
        return { user: null };
      }
      return {
        user: {
          id: context.session.user.id,
          email: context.session.user.email,
          name: context.session.user.name,
        },
      };
    }),
    hello: authed.user.hello.handler(({ context }) => {
      const name = context.session?.user.name ?? "Guest";
      return { message: `Hello, ${name}!` };
    }),
  },
});

export type Router = typeof router;
