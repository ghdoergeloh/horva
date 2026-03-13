import path from "node:path";
import { fileURLToPath } from "node:url";
import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, shell } from "electron";

import { seed } from "@repo/core";

import { db } from "./db.js";
import { registerHandlers } from "./ipc/handlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const icon =
    process.platform === "darwin"
      ? path.join(__dirname, "../../build/icon.icns")
      : path.join(__dirname, "../../build/icon.png");
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      // sandbox: false is required because the preload script imports Node.js modules
      // (@repo/core, @repo/db) via contextBridge. Enabling sandbox would prevent preload
      // from accessing Node.js APIs. Risk: a renderer XSS would have Node.js access.
      // Mitigate by keeping contextIsolation: true and validating all IPC inputs.
      sandbox: false,
      contextIsolation: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
  if (is.dev && rendererUrl) {
    void win.loadURL(rendererUrl);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(async () => {
  await seed(db);
  registerHandlers(ipcMain, db);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
