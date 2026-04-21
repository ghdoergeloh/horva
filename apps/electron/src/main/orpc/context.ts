import type { HandlerContext } from "@horva/core";
import type { Db } from "@horva/db/client";
import { eq } from "@horva/db";
import { user } from "@horva/db/schema";

export type LocalContext = HandlerContext;

/**
 * Build the oRPC session context for a locally-running Electron instance.
 *
 * Resolves the user row keyed by the id we wrote to config.json during setup.
 * Throws if the row has gone missing, which shouldn't happen unless the user
 * pointed the app at a different database — in that case they need to re-run
 * setup. The handler surfaces the error via oRPC, and the renderer can
 * interpret it as "re-bootstrap required".
 */
export async function createLocalContext(
  db: Db,
  userId: string,
): Promise<LocalContext> {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!row) {
    throw new Error(
      `Local user ${userId} not found in the configured database. Re-run setup.`,
    );
  }
  return {
    db,
    session: {
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
      },
    },
  };
}
