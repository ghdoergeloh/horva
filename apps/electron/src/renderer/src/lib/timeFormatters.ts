export function fmt(d: Date | string): string {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${String(totalMin)}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${String(h)}h` : `${String(h)}h ${String(m)}min`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${String(m)}m`;
  return m > 0 ? `${String(h)}h ${String(m)}m` : `${String(h)}h`;
}

export function applyTimeString(base: string, time: string): string {
  const d = new Date(base);
  const [hStr, mStr] = time.split(":");
  d.setHours(parseInt(hStr ?? "0", 10), parseInt(mStr ?? "0", 10), 0, 0);
  return d.toISOString();
}
