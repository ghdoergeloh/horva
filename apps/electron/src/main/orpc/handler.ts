import type { IpcMain } from "electron";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";

import type { Db } from "@horva/db/client";

import { createLocalContext } from "./context.js";
import { router } from "./router.js";

/**
 * Attach the oRPC MessagePort handler to the ipcMain channel the renderer
 * will use to send its server-side MessagePort.
 *
 * Flow:
 *   renderer  -> new MessageChannel() -> window.postMessage("orpc:init")
 *   preload   -> ipcRenderer.postMessage("orpc:port")
 *   main      -> ipcMain.on("orpc:port") -> rpcHandler.upgrade(port)
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
    rpcHandler.upgrade(serverPort, {
      context: createLocalContext(db),
    });
    serverPort.start();
  });
}
