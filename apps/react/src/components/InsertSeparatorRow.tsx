import { useState } from "react";

import { Button } from "@horva/ui/Button";

export function InsertSeparatorRow({ onInsert }: { onInsert: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="h-1"
    >
      <td colSpan={6} className="relative p-0">
        {hovered && (
          <>
            <div className="border-primary/30 absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed" />
            <Button
              variant="primary"
              onPress={onInsert}
              className="bg-primary text-primary-foreground hover:bg-primary absolute top-1/2 left-0 flex h-4 w-4 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full text-xs"
              aria-label="+"
            >
              +
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}
