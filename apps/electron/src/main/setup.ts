import { randomUUID } from "node:crypto";
import type { IpcMain } from "electron";

import type { Database } from "@horva/db/client";
import { seed } from "@horva/core";
import { readConfig, updateConfig } from "@horva/core/config";
import { eq } from "@horva/db";
import { user } from "@horva/db/schema";

const DATABASE_URL_PATTERN = /^(postgres(ql)?:\/\/|file:\/\/\/)/;
const LOCAL_USER_EMAIL_SUFFIX = "@horva.local";

interface SetupStatus {
  ready: boolean;
  error: string | null;
  defaults: {
    /** The URL of config.json, else the local database. */
    databaseUrl: string;
    /** The `file:` URL of the local database in the app's data folder. */
    localDatabaseUrl: string;
  };
}

interface CompleteSetupInput {
  name: string;
  databaseUrl: string;
}

/**
 * Track whether setup has been completed this session. Once true, the oRPC
 * handler has a valid session context and the renderer can proceed to the
 * normal UI. The main process flips this after seeding and ensuring the
 * local user row exists.
 */
let isReady = false;
let bootError: string | null = null;

export function markReady(): void {
  isReady = true;
  bootError = null;
}

export function setBootError(message: string): void {
  bootError = message;
}

/**
 * Register the setup IPC channels. These are deliberately NOT part of the
 * oRPC contract: they operate outside the DB-ready context and are only
 * meaningful to the Electron bootstrap flow.
 */
export interface SetupDeps {
  /** The lazy connection; it connects with DATABASE_URL on first use. */
  db: Database;
  /** Ends the open pool, so the next query connects to the new URL. */
  disconnect: () => Promise<void>;
  /** The `file:` URL of the local database in the app's data folder. */
  localDatabaseUrl: string;
  /** Brings the database at the URL to the current schema. */
  prepare: (databaseUrl: string) => Promise<void>;
  onReady: (databaseUrl: string, userId: string) => Promise<void>;
}

export function registerSetupHandlers(
  ipcMain: Pick<IpcMain, "handle">,
  { db, disconnect, localDatabaseUrl, prepare, onReady }: SetupDeps,
): void {
  ipcMain.handle("setup:status", (): SetupStatus => {
    const cfg = readConfig();
    return {
      ready: isReady,
      error: bootError,
      defaults: {
        databaseUrl: cfg?.databaseUrl ?? localDatabaseUrl,
        localDatabaseUrl,
      },
    };
  });

  ipcMain.handle("setup:retry", async (): Promise<void> => {
    const cfg = readConfig();
    if (!cfg?.userId || !cfg.databaseUrl) {
      throw new Error("Not configured yet");
    }
    process.env["DATABASE_URL"] = cfg.databaseUrl;
    try {
      await prepare(cfg.databaseUrl);
      await seed(db);
      markReady();
    } catch (err) {
      bootError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  });

  ipcMain.handle(
    "setup:complete",
    async (_e, input: CompleteSetupInput): Promise<void> => {
      const trimmedName = input.name.trim();
      if (!trimmedName) throw new Error("Display name is required");
      if (!DATABASE_URL_PATTERN.test(input.databaseUrl)) {
        throw new Error("Database URL must be a postgres:// or file:/// URL");
      }

      // An earlier try with a wrong URL may have opened a pool. Close it, so
      // the first query below connects to this URL.
      await disconnect();
      process.env["DATABASE_URL"] = input.databaseUrl;

      const existing = readConfig();
      const userId = existing?.userId ?? randomUUID();

      updateConfig({ databaseUrl: input.databaseUrl, userId });

      await prepare(input.databaseUrl);
      await onReady(input.databaseUrl, userId);

      // db is a lazy Proxy over the pool — first access below creates it,
      // which is safe because we set DATABASE_URL a few lines up.
      const existingRow = await db.query.user.findFirst({
        where: eq(user.id, userId),
      });
      const email = `${userId}${LOCAL_USER_EMAIL_SUFFIX}`;
      if (!existingRow) {
        await db.insert(user).values({
          id: userId,
          name: trimmedName,
          email,
          emailVerified: true,
        });
      } else if (existingRow.name !== trimmedName) {
        await db
          .update(user)
          .set({ name: trimmedName, updatedAt: new Date() })
          .where(eq(user.id, userId));
      }

      markReady();
    },
  );
}
