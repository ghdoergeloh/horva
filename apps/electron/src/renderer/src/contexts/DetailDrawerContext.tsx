import { createContext, useContext, useState } from "react";

export type DetailTarget =
  { type: "project"; id: number } | { type: "task"; id: number };

interface DetailDrawerContextValue {
  detail: DetailTarget | null;
  openProject: (id: number) => void;
  openTask: (id: number) => void;
  close: () => void;
}

const DetailDrawerContext = createContext<DetailDrawerContextValue | undefined>(
  undefined,
);

export function DetailDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const value: DetailDrawerContextValue = {
    detail,
    openProject: (id) => setDetail({ type: "project", id }),
    openTask: (id) => setDetail({ type: "task", id }),
    close: () => setDetail(null),
  };

  return <DetailDrawerContext value={value}>{children}</DetailDrawerContext>;
}

export function useDetailDrawer() {
  const ctx = useContext(DetailDrawerContext);
  if (!ctx)
    throw new Error("useDetailDrawer must be used within DetailDrawerProvider");
  return ctx;
}
