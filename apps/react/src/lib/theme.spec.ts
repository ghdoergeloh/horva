import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyTheme,
  getThemePreference,
  setThemePreference,
  watchSystemTheme,
} from "./theme";

type Listener = () => void;
let systemDark = false;
const listeners: Listener[] = [];

function isDark() {
  return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
  systemDark = false;
  listeners.length = 0;
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") && systemDark,
    addEventListener: (_: string, listener: Listener) =>
      listeners.push(listener),
  }));
});

describe("theme", () => {
  it("defaults to the system preference", () => {
    expect(getThemePreference()).toBe("system");
    systemDark = true;
    applyTheme();
    expect(isDark()).toBe(true);
  });

  it("stores and applies an explicit preference", () => {
    setThemePreference("dark");
    expect(getThemePreference()).toBe("dark");
    expect(isDark()).toBe(true);

    setThemePreference("light");
    expect(isDark()).toBe(false);

    setThemePreference("system");
    expect(localStorage.length).toBe(0);
  });

  it("follows OS changes only in system mode", () => {
    watchSystemTheme();
    systemDark = true;
    listeners.forEach((listener) => listener());
    expect(isDark()).toBe(true);

    setThemePreference("light");
    listeners.forEach((listener) => listener());
    expect(isDark()).toBe(false);
  });
});
