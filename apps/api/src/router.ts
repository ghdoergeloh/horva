import { implement } from "@orpc/server";

import { auth } from "@repo/auth/auth";
import { contract } from "@repo/contract";
import { handlers } from "@repo/core";
import { db } from "@repo/db/client";

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
    me: authed.user.me.handler(({ context }) =>
      handlers.user.me({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
    hello: authed.user.hello.handler(({ context }) =>
      handlers.user.hello({
        input: undefined,
        context: { db, session: context.session },
      }),
    ),
  },
});
