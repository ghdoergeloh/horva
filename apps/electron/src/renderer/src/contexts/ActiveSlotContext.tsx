import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ActiveSlot {
  id: number;
  startedAt: Date | string;
  state: string;
  task?: {
    id: number;
    name: string;
    project: { name: string; color: string };
  } | null;
}

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
    queryFn: () =>
      (
        window.api.slots.getOpen() as Promise<ActiveSlot | null | undefined>
      ).then((r) => r ?? null),
    // Fallback polling — primary updates come via db:changed IPC event
    refetchInterval: 60_000,
  });

  // Subscribe to main-process push notifications after every DB mutation.
  useEffect(() => {
    const unsubscribe = window.events.onDbChanged((scope) => {
      if (scope === "slots" || scope === "all") {
        void queryClient.invalidateQueries({ queryKey: ["slots"] });
      }
      if (scope === "tasks" || scope === "all") {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

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
