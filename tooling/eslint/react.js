import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";

/** Composable React config - use with baseConfig */
export const reactConfig = defineConfig({
  files: ["**/*.{ts,tsx}"],
  extends: [
    reactPlugin.configs.flat["recommended"],
    reactPlugin.configs.flat["jsx-runtime"],
    reactHooks.configs.flat["recommended-latest"],
    reactRefresh.configs.vite,
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
});
