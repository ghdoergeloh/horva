import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

import type { Contract } from "@repo/contract";

const link = new RPCLink({
  url: `${import.meta.env["VITE_API_URL"] as string}/api`,
  // Send the better-auth session cookie to the API on another origin.
  fetch: (request, init) =>
    globalThis.fetch(request, { ...init, credentials: "include" }),
});

/** Typed oRPC client for the API contract. */
const client: ContractRouterClient<Contract> = createORPCClient(link);

/** TanStack Query helpers, e.g. `useQuery(orpc.user.hello.queryOptions())`. */
export const orpc = createTanstackQueryUtils(client);

export const queryClient = new QueryClient();
