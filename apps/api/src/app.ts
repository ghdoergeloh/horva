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
    // The React app dev server (apps/react). Dev-only and harmless on prod.
    origin: ["http://localhost:5173"],
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

// Serve the built React app. In dev the app runs on :5173 via
// `pnpm -F @horva/react dev` and hits this process for API/auth only; in
// production the API process serves the static bundle out of apps/react/dist.
// SPA fallback sends any non-/api request that doesn't match a static file
// back to index.html so TanStack Router's browser history works on refresh.
const WEB_DIST = process.env["HORVA_WEB_DIST"] ?? "../react/dist";
app.use("/assets/*", serveStatic({ root: WEB_DIST }));
app.get("*", serveStatic({ path: `${WEB_DIST}/index.html` }));

export default app;
