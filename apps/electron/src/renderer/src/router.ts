import type { createHashHistory } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen.js";

export const queryClient = new QueryClient();

type RouterHistory = ReturnType<typeof createHashHistory>;

/**
 * Create the TanStack router. Callers inject the history implementation so
 * Electron can use hash history (no back-end route handling) and web can use
 * browser history.
 */
export function createAppRouter(history: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
