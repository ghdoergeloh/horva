import path from "node:path";
import { fileURLToPath } from "node:url";
import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, shell } from "electron";

import { seed } from "@horva/core";
import { readConfig } from "@horva/core/config";

import { db } from "./db.js";
import { registerOrpcHandler } from "./orpc/handler.js";
import { markReady, registerSetupHandlers } from "./setup.js";

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
      // (@horva/core, @horva/db) via contextBridge. Enabling sandbox would prevent preload
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
  // Register IPC handlers unconditionally — they're valid whether or not
  // setup has happened yet. If setup is already done we boot straight into
  // the normal flow; otherwise the renderer shows the wizard on first
  // paint and drives the bootstrap via setup:* IPC.
  registerOrpcHandler(ipcMain, db);
  registerSetupHandlers(ipcMain, {
    async onReady() {
      // Called by setup:complete after the user confirms. By this point
      // DATABASE_URL is set, the user row is ensured. Seed the rest of the
      // fixtures (default project, etc.) before marking ready.
      await seed(db);
    },
  });

  const cfg = readConfig();
  if (cfg?.userId && cfg.databaseUrl) {
    // Already set up — seed idempotently and mark ready before the window
    // paints so the renderer doesn't flash the wizard.
    process.env["DATABASE_URL"] = cfg.databaseUrl;
    await seed(db);
    markReady();
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
