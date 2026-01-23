import { serve } from "@hono/node-server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { createRPCContext, router } from "./rpc";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.json({ message: "Hello from Hono!" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

const rpcHandler = new RPCHandler(router);

app.use("/api/rpc/*", async (c) => {
  const context = await createRPCContext(c);
  const response = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context,
  });
  return response ?? c.notFound();
});

const port = Number(process.env["API_PORT"]) || 3000;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
