import { implement } from "@orpc/server";
import { contract } from "@repo/contract";
import type { Context } from "hono";
import { auth } from "../auth";

type RPCContext = {
  user: Awaited<ReturnType<typeof auth.api.getSession>> | null;
};

const base = implement(contract).context<RPCContext>();

export const router = base.router({
  user: base.router({
    me: base.user.me.handler(async ({ context }) => {
      if (!context.user?.session) {
        return { user: null };
      }
      return {
        user: {
          id: context.user.user.id,
          email: context.user.user.email,
          name: context.user.user.name,
        },
      };
    }),
    hello: base.user.hello.handler(async ({ context }) => {
      const name = context.user?.user.name ?? "Guest";
      return { message: `Hello, ${name}!` };
    }),
  }),
});

export type Router = typeof router;

export async function createRPCContext(c: Context): Promise<RPCContext> {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  return { user: session };
}
