import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { queryClient } from "./lib/orpc";
import { applyTheme, watchSystemTheme } from "./lib/theme";
import { routeTree } from "./routeTree.gen";

import "./index.css";

// Apply the theme before the first paint to avoid a light/dark flash.
applyTheme();
watchSystemTheme();

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
