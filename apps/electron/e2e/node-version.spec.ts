import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ElectronApplication } from "@playwright/test";
import { _electron as electron, expect, test } from "@playwright/test";

// Needs a build first, see setup-wizard.spec.ts.
const MAIN_ENTRY = path.resolve(import.meta.dirname, "../out/main/index.js");

/** The major of the @types/node that this app type-checks against. */
async function typesMajor(): Promise<number> {
  const file = createRequire(import.meta.url).resolve(
    "@types/node/package.json",
  );
  const { version } = JSON.parse(await readFile(file, "utf8")) as {
    version: string;
  };
  return Number(version.split(".")[0]);
}

// The main process runs on the Node.js inside Electron, which can be older
// than the one in .nvmrc. When this fails after an Electron update, set the
// `electron` catalog in pnpm-workspace.yaml to that Node.js major.
test("type-checks against the Node.js major inside Electron", async () => {
  const configDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-config-"));
  const userDataDir = await mkdtemp(path.join(tmpdir(), "horva-e2e-userdata-"));
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, "--no-sandbox"],
      env: { ...process.env, XDG_CONFIG_HOME: configDir },
    });
    const nodeVersion = await app.evaluate(() => process.versions.node);
    expect(Number(nodeVersion.split(".")[0])).toBe(await typesMajor());
  } finally {
    await app?.close();
    await rm(configDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});
