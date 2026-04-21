import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "~/lib/orpc";

type OpenSlotResponse = Awaited<ReturnType<typeof client.slot.status>>["slot"];

export type ActiveSlot = NonNullable<OpenSlotResponse>;

interface ActiveSlotContextValue {
  openSlot: ActiveSlot | null | undefined;
  isLoading: boolean;
  invalidate: () => Promise<void>;
}

const ActiveSlotContext = createContext<ActiveSlotContextValue | undefined>(
  undefined,
);

export function ActiveSlotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const { data: openSlot, isLoading } = useQuery({
    queryKey: ["slots", "open"],
    queryFn: async () => {
      const res = await client.slot.status();
      return res.slot;
    },
    // Fallback polling keeps the active-slot duration display fresh even if
    // another window or the CLI advances the state.
    refetchInterval: 60_000,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
  }

  return (
    <ActiveSlotContext value={{ openSlot, isLoading, invalidate }}>
      {children}
    </ActiveSlotContext>
  );
}

export function useActiveSlot() {
  const ctx = useContext(ActiveSlotContext);
  if (!ctx)
    throw new Error("useActiveSlot must be used within ActiveSlotProvider");
  return ctx;
}
