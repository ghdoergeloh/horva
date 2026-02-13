import { oc } from "@orpc/contract";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export const contract = oc.router({
  user: oc.router({
    me: oc
      .route({
        method: "GET",
        path: "/user/me",
      })
      .output(z.object({ user: userSchema.nullable() })),
    hello: oc
      .route({
        method: "GET",
        path: "/user/hello",
      })
      .output(z.object({ message: z.string() })),
  }),
});

export type Contract = typeof contract;
