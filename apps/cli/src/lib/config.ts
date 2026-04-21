import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HorvaConfig {
  databaseUrl: string;
}

function configDir(): string {
  return join(
    process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
    "horva",
  );
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfig(): HorvaConfig | null {
  const p = configPath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as HorvaConfig;
  } catch {
    return null;
  }
}

export function writeConfig(cfg: HorvaConfig): void {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + "\n", "utf8");
}
