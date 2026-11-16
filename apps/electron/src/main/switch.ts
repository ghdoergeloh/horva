import type { IpcMain } from "electron";

import type { Database, DatabaseConnection } from "@horva/db/client";
import { readConfig, updateConfig } from "@horva/core/config";
import { eq } from "@horva/db";
import {
  checkDatabaseUrl,
  createDatabase,
  isPgliteUrl,
  shownUrl,
} from "@horva/db/client";
import { copyDatabase } from "@horva/db/copy";
import { inspectDatabase } from "@horva/db/inspect";
import { migrateDatabase } from "@horva/db/migrate";
import { user } from "@horva/db/schema";

import { errorMessage } from "./setup.js";

/** What the settings show about the database in use. */
interface DatabaseStatus {
  /** The URL in use, without its password. */
  url: string;
  /** The `file:` URL of the app's own folder. */
  localDatabaseUrl: string;
}

/** The result of a check of the database the user wants to use. */
interface TargetInspection {
  /** True when the target holds no rows, so the data can be copied in. */
  empty: boolean;
}

interface SwitchInput {
  url: string;
  /** Copy the data of the database in use into the (empty) target. */
  copy: boolean;
}

export interface SwitchDeps {
  /** The database in use. */
  db: Database;
  /** Its URL. */
  currentUrl: string;
  /** Lets the app use the database at `url`. config.json already has it. */
  reconnect: (url: string) => Promise<void>;
}

async function withConnection<T>(
  url: string,
  run: (connection: DatabaseConnection) => Promise<T>,
): Promise<T> {
  const connection = createDatabase(url, { maxConnections: 1 });
  try {
    return await run(connection);
  } finally {
    await connection.close().catch(() => undefined);
  }
}

/**
 * Checks that Horva can use the database at `url`, without changing it.
 * Throws with the reason when it cannot.
 */
async function check(
  connection: DatabaseConnection,
  url: string,
): Promise<TargetInspection & { migrate: boolean }> {
  const state = await inspectDatabase(connection.db);
  if (state.foreignTables.length > 0) {
    throw new Error(
      `The database has tables of another app (${state.foreignTables.join(", ")}). ` +
        "Choose an empty database or one of Horva.",
    );
  }
  if (state.hasSchema && state.migrations === "none") {
    throw new Error(
      "The database has the tables of Horva, but no migration journal. " +
        "Run `horva migrate` for it first.",
    );
  }
  if (state.migrations === "other") {
    throw new Error(
      "The database was set up by a newer version of Horva. Update the app first.",
    );
  }
  // A server may be shared, e.g. with the web app: Horva migrates only a
  // new one. The app's own folders it migrates as on every start.
  if (state.migrations === "behind" && !isPgliteUrl(url)) {
    throw new Error(
      "The database is on an older version of Horva. Run `horva migrate` for it first.",
    );
  }
  return { empty: state.empty, migrate: state.migrations !== "latest" };
}

function checkUrl(url: string, currentUrl: string): void {
  checkDatabaseUrl(url);
  if (url === currentUrl) {
    throw new Error("Horva already uses this database.");
  }
}

/** Checks the database at `url` before the user switches to it. */
export async function inspectTarget(
  url: string,
  currentUrl: string,
): Promise<TargetInspection> {
  checkUrl(url, currentUrl);
  const { empty } = await withConnection(url, (target) => check(target, url));
  return { empty };
}

/**
 * Lets the app use the database at `url` from now on. With `copy`, the data
 * of the database in use goes into the target first; the target must be
 * empty. The database in use keeps its data either way. config.json gets
 * the new URL only after the target is ready. When the app cannot start
 * with the target, it goes back to the database in use.
 */
export async function switchDatabase(
  { url, copy }: SwitchInput,
  { db, currentUrl, reconnect }: SwitchDeps,
): Promise<void> {
  checkUrl(url, currentUrl);
  const userId = readConfig()?.userId;
  if (!userId) throw new Error("Horva is not set up yet.");

  await withConnection(url, async (target) => {
    const state = await check(target, url);
    if (copy && !state.empty) {
      throw new Error(
        "The database already holds data. Use it without copying, or choose an empty one.",
      );
    }
    if (state.migrate) await migrateDatabase(target);
    if (copy) {
      await copyDatabase(db, target.db);
      return;
    }
    // The user of this app must exist in the target, with the same id.
    const exists = await target.db.query.user.findFirst({
      where: eq(user.id, userId),
    });
    if (exists) return;
    const me = await db.query.user.findFirst({ where: eq(user.id, userId) });
    if (!me) throw new Error("The user of this app is missing.");
    await target.db.insert(user).values(me);
  });

  updateConfig({ databaseUrl: url });
  try {
    await reconnect(url);
  } catch (err) {
    updateConfig({ databaseUrl: currentUrl });
    // If this fails too, the app shows its start error with a retry.
    await reconnect(currentUrl).catch(() => undefined);
    throw err;
  }
}

/**
 * Points the lazy `connection` of the app to `url` and starts the app with
 * it. The URL changes before the old database closes: a query that comes
 * in meanwhile must open the new database, not the old one again.
 */
export async function reconnectDatabase(
  connection: Pick<DatabaseConnection, "close">,
  url: string,
  start: () => Promise<void>,
): Promise<void> {
  process.env["DATABASE_URL"] = url;
  await connection.close().catch(() => undefined);
  await start();
}

/** The IPC channels of the database section in the settings. */
export function registerDatabaseHandlers(
  ipcMain: Pick<IpcMain, "handle">,
  deps: Omit<SwitchDeps, "currentUrl"> & {
    currentUrl: () => string;
    localDatabaseUrl: string;
  },
): void {
  const { currentUrl, localDatabaseUrl } = deps;
  // Errors keep only their messages: the renderer shows them as they are.
  const plain = async <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (err) {
      throw new Error(errorMessage(err), { cause: err });
    }
  };

  ipcMain.handle("database:status", (): DatabaseStatus => ({
    url: shownUrl(currentUrl()),
    localDatabaseUrl,
  }));
  ipcMain.handle("database:inspect", (_e, url: string) =>
    plain(() => inspectTarget(url, currentUrl())),
  );
  ipcMain.handle("database:switch", (_e, input: SwitchInput) =>
    plain(() => switchDatabase(input, { ...deps, currentUrl: currentUrl() })),
  );
}
