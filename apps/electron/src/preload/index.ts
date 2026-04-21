import { ipcRenderer } from "electron";

// Forward MessagePort handshake from renderer to main for oRPC transport.
// The renderer creates a MessageChannel and posts "orpc:init" with one port
// to the window; we relay that port over ipcRenderer so the main process
// can upgrade it with oRPC's RPCHandler. See src/main/orpc/handler.ts.
//
// tsconfig.node.json doesn't include DOM types (preload is a node-ish
// context), so hand-shape the minimal surface we touch here.
interface PortMessageEvent {
  readonly data: unknown;
  readonly ports: readonly unknown[];
}
interface MinimalWindow {
  addEventListener(
    type: "message",
    listener: (event: PortMessageEvent) => void,
  ): void;
}

declare const window: MinimalWindow;

window.addEventListener("message", (event) => {
  if (event.data !== "orpc:init") return;
  const serverPort = event.ports[0];
  if (!serverPort) return;
  // `serverPort` is a real MessagePort at runtime. The DOM MessagePort type
  // isn't in this tsconfig's lib, so we launder through the transferable list
  // parameter that Electron's ipcRenderer.postMessage accepts.
  (
    ipcRenderer as unknown as {
      postMessage(channel: string, message: unknown, transfer: unknown[]): void;
    }
  ).postMessage("orpc:port", null, [serverPort]);
});
