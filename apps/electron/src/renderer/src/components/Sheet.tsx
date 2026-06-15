import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@horva/ui/Button";

/**
 * Right-hand slide-over panel. Lightweight overlay in the same style as the
 * app's other modals (NewProjectModal, MocoSyncModal) — no react-aria needed.
 * Closes on the X button, a click on the backdrop, or Escape.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Drive the slide-in transition: mount off-screen, then translate to 0.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="bg-foreground/30 fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border-border bg-card fixed top-0 right-0 flex h-full w-[28rem] max-w-[90vw] flex-col border-l shadow-xl transition-transform duration-200 ease-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-foreground truncate text-sm font-semibold">
            {title}
          </h2>
          <Button
            variant="quiet"
            onPress={onClose}
            className="text-muted-foreground hover:text-foreground/80 rounded p-0.5"
            aria-label={title}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
