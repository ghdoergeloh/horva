import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * Checks for the editor and the dev container. Both read versions and paths
 * that no build step uses, so a dependency update can break them silently.
 */

/** Editor settings files, relative to the repository root. */
const settingsFiles = [
  ".vscode/settings.json",
  ".devcontainer/devcontainer.json",
];

function read(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

describe("the editor settings", () => {
  it.each(settingsFiles)(
    "%s points typescript.tsdk only at a tsserver",
    (file) => {
      const tsdks = [
        ...read(file).matchAll(/"typescript\.tsdk":\s*"([^"]+)"/g),
      ];
      for (const [, tsdk = ""] of tsdks)
        expect(
          existsSync(path.join(root, tsdk, "tsserver.js")),
          `${tsdk} has no tsserver.js`,
        ).toBe(true);
    },
  );
});

describe("the dev container", () => {
  it("installs the pnpm version from packageManager", () => {
    const { packageManager } = JSON.parse(read("package.json")) as {
      packageManager: string;
    };
    const pinned = /^ARG PNPM_VERSION=(\S+)$/m.exec(
      read(".devcontainer/Dockerfile"),
    )?.[1];
    expect(`pnpm@${pinned}`).toBe(packageManager);
  });
});
