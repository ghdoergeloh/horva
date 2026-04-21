import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { Contract } from "@horva/contract";

const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3000";

// Web build: talk to the Hono API over HTTP. The URL is configured at build
// time via VITE_API_URL (see apps/web/.env.example and CI). The fetch link
// forwards credentials so better-auth's cookie session reaches the API.
const link = new RPCLink({
  url: `${API_URL}/api`,
  fetch(request, init) {
    return fetch(request, { ...init, credentials: "include" });
  },
});

export const client: ContractRouterClient<Contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
