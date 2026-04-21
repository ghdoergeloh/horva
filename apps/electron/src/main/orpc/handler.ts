import type { IpcMain } from "electron";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";

import type { Db } from "@horva/db/client";
import { readConfig } from "@horva/core/config";

import { createLocalContext } from "./context.js";
import { router } from "./router.js";

/**
 * Attach the oRPC MessagePort handler to the ipcMain channel the renderer
 * uses to send its server-side MessagePort.
 *
 * Flow:
 *   renderer  -> new MessageChannel() -> window.postMessage("orpc:init")
 *   preload   -> ipcRenderer.postMessage("orpc:port", [port])
 *   main      -> ipcMain.on("orpc:port") -> rpcHandler.upgrade(port, { context })
 *
 * Context (db + resolved user row) is built once per connection at upgrade
 * time. That matches oRPC's static-context contract and our "local, single
 * user" deployment model — no need for per-call auth resolution.
 */
export function registerOrpcHandler(ipcMain: IpcMain, db: Db): void {
  const rpcHandler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        console.error("[oRPC]", error);
      }),
    ],
  });

  ipcMain.on("orpc:port", (event) => {
    const serverPort = event.ports[0];
    if (!serverPort) {
      console.error("[oRPC] orpc:port received without a transferred port");
      return;
    }

    const cfg = readConfig();
    if (!cfg?.userId) {
      console.error(
        "[oRPC] orpc:port received before setup completed; closing port",
      );
      serverPort.close();
      return;
    }

    // Build the per-connection context. If the user row has gone missing the
    // renderer will surface errors on the first query and can redirect to
    // setup.
    void createLocalContext(db, cfg.userId)
      .then((context) => {
        rpcHandler.upgrade(serverPort, { context });
        serverPort.start();
      })
      .catch((err: unknown) => {
        console.error("[oRPC] failed to build context", err);
        serverPort.close();
      });
  });
}
