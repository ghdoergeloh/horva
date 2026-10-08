import { useEffect, useState } from "react";

/**
 * The current time, kept in state and renewed every `intervalMs` while
 * `enabled` is true, so a render never reads the clock itself.
 */
export function useNow(intervalMs = 30_000, enabled = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
