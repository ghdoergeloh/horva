export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "app-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The stored preference, or "system" when nothing valid is stored. */
export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** Sets or removes the `dark` class on `<html>` for the given preference. */
export function applyTheme(preference = getThemePreference()) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Stores the preference and applies it right away. */
export function setThemePreference(preference: ThemePreference) {
  if (preference === "system") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
}

/** Follows OS theme changes while the preference is "system". */
export function watchSystemTheme() {
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system");
  });
}
