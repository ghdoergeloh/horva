import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The webview: the React app of apps/react with the Tauri link and the
 * setup wizard. `tauri dev` loads it from the dev server, `tauri build`
 * bundles dist/webview.
 */
export default defineConfig({
  root: "src/webview",
  // Relative asset paths, so the e2e test can serve the build from any path.
  base: "./",
  build: { outDir: "../../dist/webview", emptyOutDir: true },
  // The React app itself (apps/react) runs on 5173.
  server: {
    port: 5174,
    strictPort: true,
    // Cargo writes to src-tauri/target; that is no reason to reload.
    watch: { ignored: ["**/src-tauri/**"] },
  },
  clearScreen: false,
  plugins: [tailwindcss(), react()],
});
