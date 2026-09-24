import type { ClientContext, ClientLink } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import { API_URL } from "#/lib/apiUrl.js";

/**
 * oRPC link to the Hono API over HTTP. It sends the credentials, so the
 * better-auth session cookie reaches the API.
 */
export function createHttpLink(): ClientLink<ClientContext> {
  return new RPCLink({
    url: `${API_URL}/api`,
    fetch(request, init) {
      return fetch(request, { ...init, credentials: "include" });
    },
  });
}
