// Entry point for apps that wrap the React app, such as apps/electron. They
// provide the history, the backend link and the gate in front of the app.
export { App } from "#/App.js";
export { LoadingSpinner } from "#/components/LoadingSpinner.js";
export { setOrpcLink } from "#/lib/orpc.js";
export { applyStoredTheme } from "#/lib/theme.js";
export { createAppRouter } from "#/router.js";
