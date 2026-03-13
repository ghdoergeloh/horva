import type { ElectronAPI, ElectronEvents } from "../../../preload/index.js";

declare global {
  interface Window {
    api: ElectronAPI;
    events: ElectronEvents;
  }
}
