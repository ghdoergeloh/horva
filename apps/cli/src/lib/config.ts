import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface TtConfig {
  databaseUrl: string;
}

function configDir(): string {
  return join(
    process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
    "tt",
  );
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfig(): TtConfig | null {
  const p = configPath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as TtConfig;
  } catch {
    return null;
  }
}

export function writeConfig(cfg: TtConfig): void {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + "\n", "utf8");
}
