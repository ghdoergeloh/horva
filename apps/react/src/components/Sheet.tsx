import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";

import { useEscapeKey } from "#/lib/useEscapeKey.js";

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-hand slide-over panel for the properties of a project or task.
 * Closes on the X button, a click on the backdrop, or Escape. It takes the
 * focus when it opens, keeps Tab inside, and gives the focus back to where
 * it was when it closes.
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
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  // Drive the slide-in transition: mount off-screen, then translate to 0.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const before =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panel.current?.focus();
    return () => {
      if (before?.isConnected) before.focus();
    };
  }, []);

  useEscapeKey(onClose);
  const titleId = useId();

  function keepTabInside(e: KeyboardEvent) {
    if (e.key !== "Tab" || !panel.current) return;
    const items = [
      ...panel.current.querySelectorAll<HTMLElement>(focusable),
    ].filter((item) => item.getClientRects().length > 0);
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    // z-20 like the Modal of @horva/ui: a dialog opened from the sheet,
    // such as a delete confirmation, portals in later and lies on top.
    <div
      className="bg-foreground/30 fixed inset-0 z-20"
      // A click on the backdrop is a mouse shortcut. Keyboard users close
      // the dialog with Escape or the close button.
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Tab handling of a modal dialog, which keeps the focus inside. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={keepTabInside}
        className={`border-border bg-card fixed top-0 right-0 flex h-full w-[28rem] max-w-full flex-col border-l shadow-lg outline-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-border flex items-center justify-between gap-2 border-b py-3 pr-3 pl-5">
          <h2 id={titleId} className="text-heading text-foreground truncate">
            {title}
          </h2>
          <Button
            variant="quiet"
            size="sm"
            onPress={onClose}
            aria-label={t("drawer.close")}
          >
            <X aria-hidden />
          </Button>
        </div>
        <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
