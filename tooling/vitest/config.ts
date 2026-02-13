import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export const viteConfig = defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/index.ts"],
      reporter: ["text", "cobertura", "json"],
      provider: "istanbul",
      reportsDirectory: "./coverage",
    },
  },
});

export const viteReactConfig = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/main.tsx"],
      reporter: ["text", "cobertura", "html", "json"],
      provider: "v8",
      reportsDirectory: "./coverage",
    },
    globals: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
