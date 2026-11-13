import type { AnyRouter } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";

import type { HandlerContext } from "@horva/core";

import type { Channel, OutboundLine } from "../shared/protocol.js";
import { messageData, parseLine } from "../shared/protocol.js";
import { LinePort } from "./line-port.js";

export interface BackendDeps {
  /** Writes one line to the webview, without the line break. */
  write: (line: string) => void;
  /** The router of the setup channel; it needs no context. */
  setupRouter: AnyRouter;
  /** The router of `@horva/contract`. */
  rpcRouter: AnyRouter;
  /** The context of a new `rpc` connection; throws before the setup. */
  createContext: () => Promise<HandlerContext>;
}

/**
 * The oRPC server of the sidecar, without stdio: it takes the lines that
 * come in and writes the answers through `deps.write`. Returns the function
 * that handles one line.
 */
export function createBackend(deps: BackendDeps): (line: string) => void {
  const logErrors = {
    interceptors: [
      async <T>({ next }: { next: () => Promise<T> }): Promise<T> => {
        try {
          return await next();
        } catch (error) {
          console.error("[oRPC]", error);
          throw error;
        }
      },
    ],
  };
  const send = (message: OutboundLine) => deps.write(JSON.stringify(message));
  const portFor = (ch: Channel) =>
    new LinePort((data) => send({ ch, data: messageData(data) }));

  const setupPort = portFor("setup");
  new RPCHandler(deps.setupRouter, logErrors).upgrade(setupPort, {
    context: {},
  });

  const rpcHandler = new RPCHandler(deps.rpcRouter, logErrors);
  let rpcPort: LinePort | null = null;

  async function openRpc(): Promise<void> {
    // A reload of the webview opens a new connection; the old one ends.
    rpcPort?.close();
    const port = portFor("rpc");
    rpcPort = port;
    try {
      const context = await deps.createContext();
      if (rpcPort === port) rpcHandler.upgrade(port, { context });
    } catch (err) {
      if (rpcPort === port) rpcPort = null;
      port.close();
      send({
        ch: "rpc",
        closed: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (line) => {
    const message = parseLine(line);
    if (!message) {
      console.error("[backend] ignored a line that is not a message");
    } else if ("open" in message) {
      void openRpc();
    } else if ("data" in message) {
      if (message.ch === "setup") setupPort.deliver(message.data);
      else if (rpcPort) rpcPort.deliver(message.data);
      else console.error("[backend] rpc message before open");
    }
  };
}
