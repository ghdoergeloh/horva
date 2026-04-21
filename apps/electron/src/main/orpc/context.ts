import type { HandlerContext } from "@horva/core";

export type LocalContext = HandlerContext;

/**
 * Build the per-session oRPC context.
 *
 * Phase 4b scope: the Electron app is local-only, so the session is a fixed
 * "local user" placeholder. Phase 5 replaces this with a real user resolved
 * from config.json (first-launch wizard writes userId there).
 */
export function createLocalContext(db: HandlerContext["db"]): LocalContext {
  return {
    db,
    session: {
      user: {
        id: "local",
        email: "",
        name: "Local User",
      },
    },
  };
}
