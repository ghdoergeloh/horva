import { useState } from "react";

import { Button } from "@repo/ui/Button";

import type { ThemePreference } from "~/lib/theme";
import { getThemePreference, setThemePreference } from "~/lib/theme";

const next: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/** Cycles the color theme: system → light → dark. */
export function ThemeToggle() {
  const [preference, setPreference] = useState(getThemePreference);

  return (
    <Button
      variant="quiet"
      onPress={() => {
        setThemePreference(next[preference]);
        setPreference(next[preference]);
      }}
    >
      Theme: {preference}
    </Button>
  );
}
