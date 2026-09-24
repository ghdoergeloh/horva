/**
 * Applies the saved theme (see SettingsContext) before the first render, so
 * the app does not flash light before it turns dark.
 */
export function applyStoredTheme(): void {
  const stored = localStorage.getItem("tt-theme");
  const pref = stored === "light" || stored === "dark" ? stored : "system";
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
