import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Custom (not the shared @horva/vitest/config export): only the renderer runs
// in a browser-like environment (jsdom). Main and preload are plain Node and
// are out of scope for this config.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/renderer/src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    coverage: {
      include: ["src/renderer/src/**/*.{ts,tsx}"],
      exclude: ["src/renderer/src/**/*.{test,spec}.{ts,tsx}"],
      reporter: ["text", "cobertura", "html", "json"],
      provider: "v8",
      reportsDirectory: "./coverage",
      thresholds: {
        autoUpdate: true,
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
