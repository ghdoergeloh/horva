import { oc } from "@orpc/contract";

export const contract = oc.router({
  user: oc.router({
    me: oc.route({
      method: "GET",
      path: "/user/me",
    }),
    hello: oc.route({
      method: "GET",
      path: "/user/hello",
    }),
  }),
});

export type Contract = typeof contract;
