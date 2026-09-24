import { build } from "esbuild";

/**
 * Bundles the API with all dependencies into dist/index.js, so production
 * only needs Node.js and this one file. Workspace packages export TypeScript
 * sources, which plain Node.js cannot load.
 */
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  jsx: "automatic",
  sourcemap: true,
  // Optional native driver that `pg` loads only when it is installed.
  external: ["pg-native"],
  // Some bundled dependencies are CommonJS and call `require`.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: "info",
});
