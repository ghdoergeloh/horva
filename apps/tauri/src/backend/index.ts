import { createInterface } from "node:readline";

import { seed } from "@horva/core";
import { readConfig } from "@horva/core/config";

import { createLocalContext } from "./context.js";
import { connection, db } from "./db.js";
import { router } from "./router.js";
import { createBackend } from "./server.js";
import { createSetup } from "./setup.js";

// Entry point of the backend sidecar that the Tauri shell starts. stdout
// carries the protocol of src/shared/protocol.ts, so every log goes to
// stderr, where the shell forwards it to its own log.
console.log = console.error;
console.info = console.error;

const setup = createSetup({
  db,
  disconnect: () => connection.close(),
  seed,
});
// Before the first line is read: a set-up app opens without the wizard.
await setup.boot();

const handleLine = createBackend({
  write: (line) => process.stdout.write(`${line}\n`),
  setupRouter: setup.router,
  rpcRouter: router,
  createContext: async () => {
    const userId = readConfig()?.userId;
    if (!userId) throw new Error("Setup is not complete");
    return createLocalContext(db, userId);
  },
});

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", handleLine);
// The shell closes stdin when the app quits; the sidecar ends with it.
input.on("close", () => process.exit(0));
