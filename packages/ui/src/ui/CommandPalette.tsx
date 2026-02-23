"use client";

import type {
  AutocompleteProps as AriaAutocompleteProps,
  MenuProps as AriaMenuProps,
} from "react-aria-components";
import { useEffect } from "react";
import {
  Autocomplete as AriaAutocomplete,
  Dialog,
  useFilter,
} from "react-aria-components";

import { Menu } from "./Menu";
import { Modal } from "./Modal";
import { SearchField } from "./SearchField";

export interface CommandPaletteProps<T extends object>
  extends Omit<AriaAutocompleteProps, "children">, AriaMenuProps<T> {
  isOpen: boolean;
  onOpenChange: (isOpen?: boolean) => void;
}

export function CommandPalette<T extends object>(
  props: CommandPaletteProps<T>,
) {
  const { isOpen, onOpenChange } = props;
  const { contains } = useFilter({ sensitivity: "base" });

  useEffect(() => {
    const isMacUA = /mac(os|intosh)/i.test(navigator.userAgent);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "j" && (isMacUA ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <Modal isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog className="flex max-h-[inherit] flex-col">
        <AriaAutocomplete filter={contains} {...props}>
          <SearchField
            autoFocus
            aria-label="Search commands"
            placeholder="Search commands"
            className="m-2"
          />
          <Menu
            {...props}
            className="min-h-0 flex-1"
            renderEmptyState={() => "No results found."}
          />
        </AriaAutocomplete>
      </Dialog>
    </Modal>
  );
}
