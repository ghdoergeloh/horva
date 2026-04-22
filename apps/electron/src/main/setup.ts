import { randomUUID } from "node:crypto";
import type { IpcMain } from "electron";

import { readConfig, updateConfig } from "@horva/core/config";
import { eq } from "@horva/db";
import { user } from "@horva/db/schema";

import { db } from "./db.js";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/horva";
const LOCAL_USER_EMAIL_SUFFIX = "@horva.local";

export interface SetupStatus {
  ready: boolean;
  defaults: {
    databaseUrl: string;
  };
}

export interface CompleteSetupInput {
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

export function isSetupReady(): boolean {
  return isReady;
}

export function markReady(): void {
  isReady = true;
}

/**
 * Register the setup IPC channels. These are deliberately NOT part of the
 * oRPC contract: they operate outside the DB-ready context and are only
 * meaningful to the Electron bootstrap flow.
 */
export function registerSetupHandlers(
  ipcMain: IpcMain,
  hooks: {
    onReady: (databaseUrl: string, userId: string) => Promise<void>;
  },
): void {
  ipcMain.handle("setup:status", (): SetupStatus => {
    const cfg = readConfig();
    return {
      ready: isReady,
      defaults: {
        databaseUrl: cfg?.databaseUrl ?? DEFAULT_DATABASE_URL,
      },
    };
  });

  ipcMain.handle(
    "setup:complete",
    async (_e, input: CompleteSetupInput): Promise<void> => {
      const trimmedName = input.name.trim();
      if (!trimmedName) throw new Error("Display name is required");
      if (!input.databaseUrl.startsWith("postgres")) {
        throw new Error("Database URL must be a postgres:// URL");
      }

      // Write DATABASE_URL before touching the db proxy for the first time.
      process.env["DATABASE_URL"] = input.databaseUrl;

      const existing = readConfig();
      const userId = existing?.userId ?? randomUUID();

      updateConfig({ databaseUrl: input.databaseUrl, userId });

      await hooks.onReady(input.databaseUrl, userId);

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
