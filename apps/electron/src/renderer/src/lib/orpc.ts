import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { Contract } from "@horva/contract";

let cached: {
  client: ContractRouterClient<Contract>;
  orpc: ReturnType<
    typeof createTanstackQueryUtils<ContractRouterClient<Contract>>
  >;
} | null = null;

/**
 * Initialise the oRPC client by creating a fresh MessageChannel and handing
 * one port to the main process via the preload relay. Must NOT be called
 * before the setup wizard has completed — otherwise the main-side handler
 * will reject the port because no userId is present in config.json yet.
 */
export function initOrpc(): {
  client: ContractRouterClient<Contract>;
  orpc: ReturnType<
    typeof createTanstackQueryUtils<ContractRouterClient<Contract>>
  >;
} {
  if (cached) return cached;

  const { port1: clientPort, port2: serverPort } = new MessageChannel();
  window.postMessage("orpc:init", "*", [serverPort]);
  clientPort.start();

  const link = new RPCLink({ port: clientPort });
  const client: ContractRouterClient<Contract> = createORPCClient(link);
  const orpc = createTanstackQueryUtils(client);

  cached = { client, orpc };
  return cached;
}

/**
 * Lazy proxies so existing imports (`import { client } from "~/lib/orpc"`) keep
 * working. The actual handshake only happens on first call, which is after
 * the SetupGate has confirmed the main process is ready.
 */
export const client: ContractRouterClient<Contract> = new Proxy(
  {} as ContractRouterClient<Contract>,
  {
    get(_, prop) {
      const { client: c } = initOrpc();
      return c[prop as keyof ContractRouterClient<Contract>];
    },
  },
);

export const orpc = new Proxy(
  {} as ReturnType<
    typeof createTanstackQueryUtils<ContractRouterClient<Contract>>
  >,
  {
    get(_, prop) {
      const { orpc: o } = initOrpc();
      return o[
        prop as keyof ReturnType<
          typeof createTanstackQueryUtils<ContractRouterClient<Contract>>
        >
      ];
    },
  },
);
