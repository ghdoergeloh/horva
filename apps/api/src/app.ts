import { serveStatic } from "@hono/node-server/serve-static";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "@horva/auth/auth";

import { router } from "./router";

const app = new Hono();

app.use(
  cors({
    // 5173 is the Electron renderer in dev (hits the API for auth when run
    // standalone); 5174 is apps/web. Both are dev-only and harmless on prod.
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

app.on(["GET", "POST"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
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
    context: {
      request: c.req.raw,
    },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

// Serve the built web app. In dev the renderer runs on :5173 via
// `pnpm -F @horva/web dev` and hits this process for API/auth only; in
// production the API process serves the static bundle out of apps/web/dist.
// SPA fallback sends any non-/api request that doesn't match a static file
// back to index.html so TanStack Router's browser history works on refresh.
const WEB_DIST = process.env["HORVA_WEB_DIST"] ?? "../web/dist";
app.use("/assets/*", serveStatic({ root: WEB_DIST }));
app.get("*", serveStatic({ path: `${WEB_DIST}/index.html` }));

export default app;
