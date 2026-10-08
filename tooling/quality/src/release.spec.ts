import { readFileSync } from "node:fs";
import path from "node:path";
import load from "@commitlint/load";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
}

function readText(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

interface ReleasePleaseConfig {
  "bootstrap-sha": string;
  "include-component-in-tag": boolean;
  "bump-minor-pre-major": boolean;
  draft: boolean;
  "force-tag-creation": boolean;
  packages: Record<
    string,
    {
      "changelog-path": string;
      "extra-files"?: { path: string; jsonpath: string }[];
    }
  >;
  "changelog-sections": { type: string; hidden?: boolean }[];
}

const config = readJson<ReleasePleaseConfig>("release-please-config.json");
const manifest = readJson<Record<string, string>>(
  ".release-please-manifest.json",
);
const version = (file: string) => readJson<{ version?: string }>(file).version;
const releaseWorkflow = readText(".github/workflows/release.yml");

/** The commit types commitlint.config.js accepts, as commitlint resolves them. */
async function commitTypes(): Promise<string[]> {
  const { rules } = await load({}, { cwd: root });
  const typeEnum = rules["type-enum"];
  if (!typeEnum?.[2]) throw new Error("commitlint has no type-enum rule");
  return [...typeEnum[2]].sort();
}

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

/**
 * The commit types in the "Which commit bumps what" table of
 * CONTRIBUTING.md, split into the rows that make a release and the
 * "no release" row.
 */
function documentedTypes(): { release: string[]; none: string[] } {
  const contributing = readText("CONTRIBUTING.md");
  const start = contributing.indexOf("**Which commit bumps what**");
  const rows = contributing.slice(start).split("\n\n")[1]?.split("\n").slice(2);
  if (start < 0 || !rows) throw new Error("CONTRIBUTING.md has no bump table");
  const types = (row: string) =>
    [...row.matchAll(/`(\w+)(?:!?: …)?`/g)].map((m) => m[1] ?? "");
  const release = rows.filter((row) => !row.includes("no release"));
  const none = rows.filter((row) => row.includes("no release"));
  return {
    release: [...new Set(release.flatMap(types))].sort(),
    none: [...new Set(none.flatMap(types))].sort(),
  };
}

const sections = (hidden: boolean) =>
  config["changelog-sections"]
    .filter((s) => (s.hidden ?? false) === hidden)
    .map((s) => s.type)
    .sort();

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
    expect(releaseWorkflow).toMatch(/tags:\n\s+- "v\*"/);
  });

  it("keeps breaking changes below 1.0.0 as a minor bump", () => {
    expect(config["bump-minor-pre-major"]).toBe(true);
  });

  it("starts the first changelog at a fixed commit", () => {
    expect(config["bootstrap-sha"]).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("release drafts", () => {
  it("publishes a release only after the installers are attached", () => {
    expect(config.draft).toBe(true);
    expect(releaseWorkflow).toContain('gh release edit "$TAG" --draft=false');
  });

  it("creates the tag with the draft, so the next run finds the last release", () => {
    // GitHub makes no tag for a draft release on its own.
    expect(config["force-tag-creation"]).toBe(true);
  });
});

describe("changelog", () => {
  it("is not checked by the formatter", () => {
    // release-please writes it in its own format, which oxfmt would reject.
    const changelog = config.packages["."]?.["changelog-path"];
    const oxfmt = readJson<{ ignorePatterns: string[] }>(".oxfmtrc.json");
    expect(changelog).toBeDefined();
    expect(oxfmt.ignorePatterns).toContain(changelog);
  });
});

describe("commit types", () => {
  it("checks PR titles against the same types as commitlint", async () => {
    expect(prTitleTypes()).toEqual(await commitTypes());
  });

  it("gives every commitlint type a changelog section", async () => {
    expect([...sections(false), ...sections(true)].sort()).toEqual(
      await commitTypes(),
    );
  });

  it("documents which types make a release", () => {
    // A visible changelog section is what makes release-please open a
    // release PR.
    const documented = documentedTypes();
    expect(documented.release).toEqual(sections(false));
    expect(documented.none).toEqual(sections(true));
  });
});
