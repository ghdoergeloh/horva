import type { ClientContext, ClientLink } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";

/**
 * oRPC link to the Electron main process. It creates a MessageChannel and
 * hands one port to the main process through the preload relay (see
 * src/preload/index.ts and src/main/orpc/handler.ts).
 *
 * The React app creates the link on its first API call. That happens only
 * after SetupGate has opened, because the main process rejects the port
 * while config.json has no user yet.
 */
export function createMessagePortLink(): ClientLink<ClientContext> {
  const { port1: clientPort, port2: serverPort } = new MessageChannel();
  window.postMessage("orpc:init", "*", [serverPort]);
  clientPort.start();
  return new RPCLink({ port: clientPort });
}
