import { randomUUID } from "node:crypto";
import { implement, ORPCError } from "@orpc/server";

import type { Database } from "@horva/db/client";
import { readConfig, updateConfig } from "@horva/core/config";
import { eq } from "@horva/db";
import { user } from "@horva/db/schema";

import { setupContract } from "../shared/setup-contract.js";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/horva";
const LOCAL_USER_EMAIL_SUFFIX = "@horva.local";

/**
 * oRPC hides the message of a plain error from the client. The wizard shows
 * it (an unreachable database, a wrong password), so it goes on as a
 * BAD_REQUEST with the message.
 */
async function withMessage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ORPCError) throw err;
    throw new ORPCError("BAD_REQUEST", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface SetupDeps {
  db: Database;
  /** Ends the open pool, so the next query connects to the new URL. */
  disconnect: () => Promise<void>;
  /** Seeds the fixtures (default project, …); runs before the app opens. */
  seed: (db: Database) => Promise<void>;
}

/**
 * The state of the first-launch setup and the router of the `setup`
 * channel. `boot()` runs once at start: when config.json already has a
 * user, it seeds and marks the app ready before the webview asks.
 */
export function createSetup({ db, disconnect, seed }: SetupDeps) {
  let ready = false;
  let bootError: string | null = null;

  async function seedAndMarkReady(databaseUrl: string): Promise<void> {
    process.env["DATABASE_URL"] = databaseUrl;
    try {
      await seed(db);
      ready = true;
      bootError = null;
    } catch (err) {
      bootError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async function boot(): Promise<void> {
    const cfg = readConfig();
    if (!cfg?.userId || !cfg.databaseUrl) return;
    // The webview shows the error with a retry button.
    await seedAndMarkReady(cfg.databaseUrl).catch(() => undefined);
  }

  const os = implement(setupContract);
  const router = os.router({
    status: os.status.handler(() => ({
      ready,
      error: bootError,
      defaults: {
        databaseUrl: readConfig()?.databaseUrl ?? DEFAULT_DATABASE_URL,
      },
    })),

    retry: os.retry.handler(() =>
      withMessage(async () => {
        const cfg = readConfig();
        if (!cfg?.userId || !cfg.databaseUrl) {
          throw new Error("Not configured yet");
        }
        await seedAndMarkReady(cfg.databaseUrl);
      }),
    ),

    complete: os.complete.handler(({ input: raw }) =>
      withMessage(async () => {
        const input = {
          name: raw.name.trim(),
          databaseUrl: raw.databaseUrl.trim(),
        };
        if (!input.name) throw new Error("Display name is required");
        if (!input.databaseUrl.startsWith("postgres")) {
          throw new Error("Database URL must be a postgres:// URL");
        }
        const userId = readConfig()?.userId ?? randomUUID();
        updateConfig({ databaseUrl: input.databaseUrl, userId });

        // A wrong URL of an earlier try may have opened a pool. The lazy
        // connection opens again on the first query below, with this URL.
        await disconnect();
        process.env["DATABASE_URL"] = input.databaseUrl;
        await seed(db);

        const existing = await db.query.user.findFirst({
          where: eq(user.id, userId),
        });
        if (!existing) {
          await db.insert(user).values({
            id: userId,
            name: input.name,
            email: `${userId}${LOCAL_USER_EMAIL_SUFFIX}`,
            emailVerified: true,
          });
        } else if (existing.name !== input.name) {
          await db
            .update(user)
            .set({ name: input.name, updatedAt: new Date() })
            .where(eq(user.id, userId));
        }
        ready = true;
        bootError = null;
      }),
    ),
  });

  return { boot, router };
}
