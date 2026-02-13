import { createAuthClient } from "better-auth/react";

export function initAuthClient(options: { baseUrl: string }) {
  return createAuthClient({
    baseURL: options.baseUrl,
  });
}

export { createAuthClient };
