import { useQuery } from "@tanstack/react-query";

import { client } from "~/lib/orpc.js";

export type RemoteProject = Awaited<
  ReturnType<typeof client.moco.remoteProjects>
>["projects"][number];

/**
 * Lazily load the Moco projects assigned to the API-key owner. Not auto-run;
 * call `refetch()` to trigger it.
 */
export function useRemoteMocoProjects() {
  return useQuery({
    queryKey: ["moco", "remoteProjects"],
    queryFn: async () => (await client.moco.remoteProjects()).projects,
    enabled: false,
    staleTime: 60_000,
  });
}

/** Whether Moco credentials are configured (controls visibility of linking UI). */
export function useMocoConfigured(): boolean {
  const { data } = useQuery({
    queryKey: ["moco", "config"],
    queryFn: () => client.moco.config.get(),
  });
  return data?.configured ?? false;
}
