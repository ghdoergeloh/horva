import type { RouterHistory } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "#/routeTree.gen.js";

export const queryClient = new QueryClient();

/**
 * Create the TanStack router. Callers inject the history implementation:
 * browser history for the web app, hash history for the desktop app
 * (which loads the app from its bundle and has no server for routes).
 */
export function createAppRouter(history: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
