/** Base URL of the API, set at build time through VITE_API_URL. */
export const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3000";
