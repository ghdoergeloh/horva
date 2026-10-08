import { useEffect } from "react";

/** Calls `onEscape` when the user presses Escape anywhere in the window. */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEscape]);
}
