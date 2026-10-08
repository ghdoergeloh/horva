import { useEffect, useState } from "react";

/**
 * The current time, kept in state and renewed every `intervalMs`, so a
 * render never reads the clock itself.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
