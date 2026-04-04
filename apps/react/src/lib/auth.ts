import { initAuthClient } from "@timetracker/auth/client";

export const authClient = initAuthClient({
  baseUrl: import.meta.env["VITE_API_URL"] as string,
});
