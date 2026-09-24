import { StrictMode } from "react";
import { createHashHistory } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import {
  App,
  applyStoredTheme,
  createAppRouter,
  setOrpcLink,
} from "@horva/react";

import { SetupGate } from "./components/SetupGate.js";
import { createMessagePortLink } from "./lib/messagePortLink.js";

import "@horva/react/styles.css";

applyStoredTheme();
setOrpcLink(createMessagePortLink);

// Electron loads the app from a file, so there is no server for routes.
const router = createAppRouter(createHashHistory());

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Remove the static boot spinner once React takes over
document.getElementById("app-boot-spinner")?.remove();

createRoot(root).render(
  <StrictMode>
    <App
      router={router}
      gate={(children) => <SetupGate>{children}</SetupGate>}
    />
  </StrictMode>,
);
