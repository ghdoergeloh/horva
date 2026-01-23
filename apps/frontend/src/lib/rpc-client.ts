import { createORPCClient } from "@orpc/client";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import type { Contract } from "@repo/contract";

const client = createORPCClient<Contract>({
  baseURL: import.meta.env["VITE_API_URL"] ?? "http://localhost:3000",
  fetch: (url, options) =>
    fetch(url, {
      ...options,
      credentials: "include",
    }),
});

export const orpc = createORPCReactQueryUtils(client);
