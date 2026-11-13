import { StrictMode } from "react";
import { createHashHistory } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { createRoot } from "react-dom/client";

import {
  App,
  applyStoredTheme,
  createAppRouter,
  setOrpcLink,
} from "@horva/react";

import { createBackendLink } from "./backend.js";
import { SetupGate } from "./components/SetupGate.js";

import "@horva/react/styles.css";

applyStoredTheme();
setOrpcLink(createBackendLink);

// Links that would open a new window (the Moco link of a task) open in the
// browser of the system; the capability allows https URLs only.
document.addEventListener("click", (event) => {
  const link =
    event.target instanceof Element ? event.target.closest("a") : null;
  if (link?.target !== "_blank" || !link.href.startsWith("https:")) return;
  event.preventDefault();
  void openUrl(link.href);
});

// The webview loads the app from the bundle, so there is no server for
// routes.
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
