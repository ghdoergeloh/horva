import { createContext, useContext, useState } from "react";

export type TimeFormat = "hm" | "decimal-colon" | "decimal-dot";

const STORAGE_KEY = "tt-time-format";
const DEFAULT_FORMAT: TimeFormat = "hm";

interface SettingsContextValue {
  timeFormat: TimeFormat;
  setTimeFormat: (fmt: TimeFormat) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored === "hm" ||
      stored === "decimal-colon" ||
      stored === "decimal-dot"
    ) {
      return stored;
    }
    return DEFAULT_FORMAT;
  });

  function setTimeFormat(fmt: TimeFormat) {
    setTimeFormatState(fmt);
    localStorage.setItem(STORAGE_KEY, fmt);
  }

  return (
    <SettingsContext value={{ timeFormat, setTimeFormat }}>
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
