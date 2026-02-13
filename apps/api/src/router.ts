import { implement } from "@orpc/server";

import { contract } from "@repo/contract";

const base = implement(contract).$context();

export const router = base.router({
  user: {
    me: base.user.me.handler(() => {
      return {
        user: {
          id: "1",
          email: "test@test.com",
          name: "Test User",
        },
      };
    }),
    hello: base.user.hello.handler(() => {
      const name = "Guest";
      return { message: `Hello, ${name}!` };
    }),
  },
});

export type Router = typeof router;
