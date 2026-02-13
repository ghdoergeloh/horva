import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";

import { router } from "./router";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/api/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/api",
    context: {}, // Provide initial context if needed
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

export default app;
