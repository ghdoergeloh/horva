import { readFileSync } from "node:fs";
import path from "node:path";
import conventional from "@commitlint/config-conventional";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
}

function readText(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

interface ReleasePleaseConfig {
  "release-type": string;
  "include-component-in-tag": boolean;
  "bump-minor-pre-major": boolean;
  draft: boolean;
  packages: Record<
    string,
    { "extra-files"?: { path: string; jsonpath: string }[] }
  >;
  "changelog-sections": { type: string; hidden?: boolean }[];
}

const config = readJson<ReleasePleaseConfig>("release-please-config.json");
const manifest = readJson<Record<string, string>>(
  ".release-please-manifest.json",
);
const version = (file: string) => readJson<{ version?: string }>(file).version;

/** The commit types commitlint accepts on branch commits. */
const commitTypes = [...conventional.rules["type-enum"][2]].sort();

/** The lines of the `types: |` block in pr-title.yml. */
function prTitleTypes(): string[] {
  const block = /types: \|\n((?: {12}\S+\n)+)/.exec(
    readText(".github/workflows/pr-title.yml"),
  );
  if (!block?.[1]) throw new Error("pr-title.yml has no `types: |` block");
  return block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

describe("release versions", () => {
  it("keeps the manifest, the root package and the Electron app on one version", () => {
    expect(manifest["."]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version("package.json")).toBe(manifest["."]);
    // electron-builder names the installers after this version.
    expect(version("apps/electron/package.json")).toBe(manifest["."]);
  });

  it("lets release-please bump the Electron app version", () => {
    expect(config.packages["."]?.["extra-files"]).toContainEqual({
      type: "json",
      path: "apps/electron/package.json",
      jsonpath: "$.version",
    });
  });

  it("makes tags that start the release workflow", () => {
    // Tags are `v1.2.3`, without a component name, as release.yml expects.
    expect(config["include-component-in-tag"]).toBe(false);
    expect(readText(".github/workflows/release.yml")).toMatch(
      /tags:\n\s+- "v\*"/,
    );
  });

  it("keeps breaking changes below 1.0.0 as a minor bump", () => {
    expect(config["bump-minor-pre-major"]).toBe(true);
  });

  it("publishes a release only after the installers are attached", () => {
    // release.yml undrafts the release once the files are uploaded.
    expect(config.draft).toBe(true);
    expect(readText(".github/workflows/release.yml")).toContain(
      'gh release edit "$TAG" --draft=false',
    );
  });
});

describe("commit types", () => {
  it("checks PR titles against the same types as commitlint", () => {
    expect(prTitleTypes()).toEqual(commitTypes);
  });

  it("gives every commitlint type a changelog section", () => {
    const sections = config["changelog-sections"].map((s) => s.type).sort();
    expect(sections).toEqual(commitTypes);
  });
});
