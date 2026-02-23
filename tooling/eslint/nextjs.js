import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

/** Composable Next.js config - use with baseConfig */
export const nextjsConfig = defineConfig({
  files: ["**/*.{ts,tsx}"],
  plugins: {
    "@next/next": nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    // TypeError: context.getAncestors is not a function (ESLint 9 compatibility issue)
    "@next/next/no-duplicate-head": "off",
  },
});
