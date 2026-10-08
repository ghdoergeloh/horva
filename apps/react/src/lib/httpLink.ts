import type { ClientContext, ClientLink } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import { RPC_PATH } from "@horva/contract";

/**
 * oRPC link to the Hono API over HTTP. The API serves the SPA on the same
 * origin; in development the Vite dev server forwards /api to it. The
 * better-auth session cookie goes along by default.
 */
export function createHttpLink(): ClientLink<ClientContext> {
  return new RPCLink({
    url: new URL(RPC_PATH, globalThis.location.origin).toString(),
  });
}
