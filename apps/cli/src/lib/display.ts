import chalk from "chalk";

// Symbols per PRD
export const sym = {
  start: "▶",
  stop: "■",
  noTask: "⏺",
  done: "⏹",
  created: "✚",
  edited: "✎",
  checked: "✓",
  reopen: "↺",
  archived: "⊘",
  deleted: "✗",
  warning: "⚠",
  planned: "📅",
  interactive: "?",
};

export function colorProject(name: string, color: string): string {
  try {
    return chalk.hex(color)(name);
  } catch {
    return name;
  }
}

/** Pad a string to `width` visible characters, ignoring ANSI escape codes. */
export function padVisible(str: string, width: number): string {
  // Strip ANSI codes to measure visible length
  // eslint-disable-next-line no-control-regex
  const visible = str.replace(/\u001B\[[0-9;]*m/g, "");
  const pad = Math.max(0, width - visible.length);
  return str + " ".repeat(pad);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}:${String(m).padStart(2, "0")}h`;
}

export function formatDurationMs(ms: number): string {
  return formatDuration(Math.round(ms / 60000));
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function elapsed(from: Date): string {
  const ms = Date.now() - from.getTime();
  return formatDurationMs(ms);
}

export function progressBar(value: number, total: number, width = 20): string {
  const pct = total === 0 ? 0 : value / total;
  const filled = Math.round(pct * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function printError(msg: string): void {
  console.error(chalk.red(`${sym.warning} ${msg}`));
}

export function printSuccess(msg: string): void {
  console.log(chalk.green(msg));
}
