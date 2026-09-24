import { createContext, useContext, useEffect, useState } from "react";

export type TimeFormat = "hm" | "decimal-colon" | "decimal-dot";
export type ThemePreference = "light" | "dark" | "system";

const TIME_FORMAT_KEY = "tt-time-format";
const THEME_KEY = "tt-theme";
const DEFAULT_FORMAT: TimeFormat = "hm";
const DEFAULT_THEME: ThemePreference = "system";

interface SettingsContextValue {
  timeFormat: TimeFormat;
  setTimeFormat: (fmt: TimeFormat) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

function applyTheme(theme: ThemePreference) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    const stored = localStorage.getItem(TIME_FORMAT_KEY);
    if (
      stored === "hm" ||
      stored === "decimal-colon" ||
      stored === "decimal-dot"
    ) {
      return stored;
    }
    return DEFAULT_FORMAT;
  });

  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  function setTimeFormat(fmt: TimeFormat) {
    setTimeFormatState(fmt);
    localStorage.setItem(TIME_FORMAT_KEY, fmt);
  }

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
  }

  return (
    <SettingsContext value={{ timeFormat, setTimeFormat, theme, setTheme }}>
      {children}
    </SettingsContext>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useTimeFormat(): TimeFormat {
  return useSettings().timeFormat;
}

export function formatMinutesWithFormat(
  minutes: number,
  format: TimeFormat,
): string {
  if (format === "decimal-colon") {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h)}:${String(m).padStart(2, "0")} h`;
  }
  if (format === "decimal-dot") {
    return `${(minutes / 60).toFixed(2).replace(".", ",")} h`;
  }
  // "hm" — default
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${String(m)}m`;
  return m > 0 ? `${String(h)}h ${String(m)}m` : `${String(h)}h`;
}
