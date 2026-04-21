import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const configSchema = z.object({
  databaseUrl: z.string().min(1),
  userId: z.string().min(1).optional(),
});

export type Config = z.infer<typeof configSchema>;

export function configDir(): string {
  return join(
    process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
    "horva",
  );
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfig(): Config | null {
  const p = configPath();
  if (!existsSync(p)) return null;
  const raw: unknown = JSON.parse(readFileSync(p, "utf8"));
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export function writeConfig(cfg: Config): void {
  const validated = configSchema.parse(cfg);
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    configPath(),
    JSON.stringify(validated, null, 2) + "\n",
    "utf8",
  );
}

export function updateConfig(patch: Partial<Config>): Config {
  const existing = readConfig();
  const next = configSchema.parse({ ...existing, ...patch });
  writeConfig(next);
  return next;
}
