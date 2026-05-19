import { StrictMode } from "react";
import { createHashHistory } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { createAppRouter } from "./router.js";

import "./styles/globals.css";

// Apply persisted theme synchronously to avoid a light/dark flash on boot.
(() => {
  const stored = localStorage.getItem("tt-theme");
  const pref = stored === "light" || stored === "dark" ? stored : "system";
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.classList.toggle("dark", resolved === "dark");
})();

const router = createAppRouter(createHashHistory());

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Remove the static boot spinner once React takes over
document.getElementById("app-boot-spinner")?.remove();

createRoot(root).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>,
);
