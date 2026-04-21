import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { Contract } from "@horva/contract";

// Build a MessageChannel, hand one port to the preload (which forwards it to
// the main process via ipcRenderer.postMessage), and keep the other for the
// client link. The main process upgrades the transferred port with oRPC's
// RPCHandler — see apps/electron/src/main/orpc/handler.ts.
const { port1: clientPort, port2: serverPort } = new MessageChannel();
window.postMessage("orpc:init", "*", [serverPort]);
clientPort.start();

const link = new RPCLink({ port: clientPort });

export const client: ContractRouterClient<Contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
