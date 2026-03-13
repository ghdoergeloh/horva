import { useState } from "react";

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
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-indigo-200" />
            <button
              onClick={onInsert}
              className="absolute top-1/2 left-0 flex h-4 w-4 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-500 text-xs text-white hover:bg-indigo-600"
            >
              +
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
