import { StrictMode } from "react";
import { createBrowserHistory } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { App } from "#/App.js";
import { AuthGate } from "#/components/AuthGate.js";
import { createHttpLink } from "#/lib/httpLink.js";
import { setOrpcLink } from "#/lib/orpc.js";
import { applyStoredTheme } from "#/lib/theme.js";
import { createAppRouter } from "#/router.js";
import "#/styles/globals.css";

applyStoredTheme();
setOrpcLink(createHttpLink);

const router = createAppRouter(createBrowserHistory());

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App router={router} gate={(children) => <AuthGate>{children}</AuthGate>} />
  </StrictMode>,
);
