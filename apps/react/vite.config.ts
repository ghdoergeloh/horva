import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiPackageSrc = path.resolve(__dirname, "../../packages/ui/src");

function tryResolve(base: string): string | undefined {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    {
      name: "resolve-ui-src-paths",
      resolveId(source, importer) {
        if (
          source.startsWith("src/") &&
          importer?.includes("packages/ui/src/")
        ) {
          return tryResolve(path.resolve(uiPackageSrc, source.slice(4)));
        }
      },
    },
  ],
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
});
