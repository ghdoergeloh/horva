import type { ClientContext, ClientLink } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { Contract } from "@horva/contract";

type OrpcClient = ContractRouterClient<Contract>;
type OrpcUtils = ReturnType<typeof createTanstackQueryUtils<OrpcClient>>;

let createLink: (() => ClientLink<ClientContext>) | null = null;
let cached: { client: OrpcClient; orpc: OrpcUtils } | null = null;

/**
 * Sets how the app talks to the backend: HTTP in the browser, a MessagePort
 * in Electron. Call it once before the first render. The link is created on
 * the first API call, so a wrapper can delay its handshake until its gate
 * is open.
 */
export function setOrpcLink(factory: () => ClientLink<ClientContext>): void {
  createLink = factory;
  cached = null;
}

function init(): { client: OrpcClient; orpc: OrpcUtils } {
  if (cached) return cached;
  if (!createLink)
    throw new Error("Call setOrpcLink() before the first render");
  const client: OrpcClient = createORPCClient(createLink());
  cached = { client, orpc: createTanstackQueryUtils(client) };
  return cached;
}

export const client: OrpcClient = new Proxy({} as OrpcClient, {
  get(_, prop) {
    return init().client[prop as keyof OrpcClient];
  },
});

export const orpc: OrpcUtils = new Proxy({} as OrpcUtils, {
  get(_, prop) {
    return init().orpc[prop as keyof OrpcUtils];
  },
});
