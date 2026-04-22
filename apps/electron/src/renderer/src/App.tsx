import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { I18nProvider } from "react-aria-components";

import type { AppRouter } from "~/router.js";
import { SetupGate } from "~/components/SetupGate.js";
import i18n from "~/i18n/index.js";
import { queryClient } from "~/router.js";

const LOCALE_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
};

interface AppProps {
  router: AppRouter;
  /**
   * Gate rendered before the router. Electron wraps with SetupGate (local
   * wizard); web wraps with AuthGate (better-auth login wall).
   */
  gate?: (children: ReactNode) => ReactNode;
}

export function App({ router, gate }: AppProps) {
  const [locale, setLocale] = useState(
    LOCALE_MAP[i18n.language] ?? i18n.language,
  );

  useEffect(() => {
    function handleLanguageChanged(lng: string) {
      setLocale(LOCALE_MAP[lng] ?? lng);
    }
    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  const routerTree = <RouterProvider router={router} />;
  const gated = gate ? gate(routerTree) : <SetupGate>{routerTree}</SetupGate>;

  return (
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>{gated}</QueryClientProvider>
    </I18nProvider>
  );
}
