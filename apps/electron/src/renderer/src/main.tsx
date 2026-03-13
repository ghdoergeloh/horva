import { StrictMode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "react-aria-components";
import { createRoot } from "react-dom/client";

import i18n from "./i18n/index.js";
import { routeTree } from "./routeTree.gen.js";

import "./styles/globals.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const LOCALE_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
};

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  const [locale, setLocale] = useState(
    LOCALE_MAP[i18n.language] ?? i18n.language,
  );

  useEffect(() => {
    function handleLanguageChanged(lng: string) {
      console.log("languageChanged", lng, LOCALE_MAP[lng] ?? lng);
      setLocale(LOCALE_MAP[lng] ?? lng);
    }
    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return (
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Remove the static boot spinner once React takes over
document.getElementById("app-boot-spinner")?.remove();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
