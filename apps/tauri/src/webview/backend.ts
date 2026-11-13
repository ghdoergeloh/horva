import type { ClientContext, ClientLink } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { Channel, invoke } from "@tauri-apps/api/core";

import type {
  Channel as BackendChannel,
  InboundLine,
} from "../shared/protocol.js";
import type { SetupContract } from "../shared/setup-contract.js";
import { messageData, parseLine } from "../shared/protocol.js";

type Listener<T extends unknown[]> = (...args: T) => void;

/** A port in the shape of a browser extension port, which oRPC accepts. */
interface LinePort {
  postMessage: (data: unknown) => void;
  onMessage: { addListener: (listener: Listener<[string]>) => void };
  onDisconnect: { addListener: (listener: Listener<[]>) => void };
}

const messageListeners: Record<BackendChannel, Listener<[string]>[]> = {
  setup: [],
  rpc: [],
};
let rpcDisconnectListeners: Listener<[]>[] = [];

function dispatch(line: string): void {
  const message = parseLine(line);
  if (!message) return;
  if ("data" in message) {
    for (const listener of messageListeners[message.ch]) listener(message.data);
  } else if ("closed" in message) {
    console.error("[backend] rpc connection closed:", message.closed);
    const listeners = rpcDisconnectListeners;
    rpcDisconnectListeners = [];
    messageListeners.rpc = [];
    for (const listener of listeners) listener();
  }
}

// Commands run on a thread pool in the Rust shell, so two invokes can
// overtake each other. One chain keeps the lines in order; the first link
// hands the shell the channel for the lines of the sidecar.
let outbox: Promise<unknown> = invoke("backend_connect", {
  onMessage: new Channel<string>(dispatch),
});

function send(message: InboundLine): void {
  const line = JSON.stringify(message);
  outbox = outbox
    .then(() => invoke("backend_send", { line }))
    .catch((err: unknown) => console.error("[backend] send failed", err));
}

function portFor(ch: BackendChannel): LinePort {
  return {
    postMessage: (data) => send({ ch, data: messageData(data) }),
    onMessage: {
      addListener: (listener) => messageListeners[ch].push(listener),
    },
    onDisconnect: {
      addListener: (listener) => {
        if (ch === "rpc") rpcDisconnectListeners.push(listener);
      },
    },
  };
}

/** Client of the first-launch setup in the sidecar. */
export const setupClient: ContractRouterClient<SetupContract> =
  createORPCClient(new RPCLink({ port: portFor("setup") }));

/**
 * oRPC link to `@horva/contract` in the sidecar. The React app creates it on
 * its first API call, after SetupGate has opened, because the sidecar
 * refuses the connection while config.json has no user yet.
 */
export function createBackendLink(): ClientLink<ClientContext> {
  send({ ch: "rpc", open: true });
  return new RPCLink({ port: portFor("rpc") });
}
