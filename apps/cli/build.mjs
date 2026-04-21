#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { build, context } from "esbuild";

const watchMode = process.argv.includes("--watch");

// Bundle workspace packages (@horva/*) inline; keep third-party deps external
// so they are resolved from node_modules at runtime.
const thirdPartyExternal = [
  "@inquirer/prompts",
  "chalk",
  "commander",
  "dotenv",
  "pg",
  "pg-native",
];

const options = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: "dist/index.js",
  external: thirdPartyExternal,
  loader: { ".sql": "text" },
};

if (watchMode) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(options);
  writePublishManifest();
}

/**
 * Write dist/package.json for `pnpm pack` / publishing.
 *
 * The compiled bundle includes all @horva/* workspace packages inline, so the
 * only real runtime dependencies are the third-party externals listed above.
 * Catalog version specifiers are resolved from the workspace root so the
 * published manifest contains concrete version ranges.
 */
function writePublishManifest() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const catalog = resolveCatalogs();

  const resolvedDeps = {};
  for (const name of thirdPartyExternal) {
    const raw = pkg.dependencies?.[name];
    if (!raw) continue;
    resolvedDeps[name] = resolveCatalogRef(name, raw, catalog);
  }
  // pg-native is optional/peer — only include if explicitly listed
  if (pkg.dependencies?.["pg-native"]) {
    resolvedDeps["pg-native"] = resolveCatalogRef(
      "pg-native",
      pkg.dependencies["pg-native"],
      catalog,
    );
  }

  // Rewrite bin paths: strip the leading "dist/" since we pack from dist/
  const bin = {};
  for (const [cmd, path] of Object.entries(pkg.bin ?? {})) {
    bin[cmd] = path.replace(/^\.\/dist\//, "./");
  }

  const manifest = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    bin,
    engines: pkg.engines,
    dependencies: resolvedDeps,
  };
  // Drop undefined top-level keys
  for (const k of Object.keys(manifest)) {
    if (manifest[k] === undefined) delete manifest[k];
  }

  writeFileSync("dist/package.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log("Wrote dist/package.json");
}

function resolveCatalogRef(name, version, catalog) {
  if (version === "catalog:") return catalog.default?.[name] ?? version;
  const m = version.match(/^catalog:(.+)$/);
  if (m) return catalog[m[1]]?.[name] ?? version;
  return version;
}

function resolveCatalogs() {
  try {
    const ws = readFileSync("../../pnpm-workspace.yaml", "utf8");
    // Simple line-by-line YAML parser — good enough for flat catalog entries
    const result = { default: {} };
    let currentCatalog = null;
    for (const raw of ws.split("\n")) {
      const line = raw.trimEnd();
      if (line === "catalog:") {
        currentCatalog = "default";
        continue;
      }
      const catalogHeader = line.match(/^  (\w[\w-]*):\s*$/);
      if (catalogHeader && currentCatalog !== null) {
        currentCatalog = catalogHeader[1];
        result[currentCatalog] ??= {};
        continue;
      }
      if (currentCatalog === null) continue;
      const entry = line.match(/^\s{2,4}"?(@?[^":\s]+)"?:\s*(.+)$/);
      if (entry) {
        const [, pkgName, ver] = entry;
        result[currentCatalog][pkgName] = ver.trim();
      }
    }
    return result;
  } catch {
    return { default: {} };
  }
}
