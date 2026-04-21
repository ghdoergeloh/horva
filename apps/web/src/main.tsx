import { StrictMode } from "react";
import { createBrowserHistory } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { App } from "~/App.js";
import { createAppRouter } from "~/router.js";

import "~/styles/globals.css";

const router = createAppRouter(createBrowserHistory());

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>,
);
