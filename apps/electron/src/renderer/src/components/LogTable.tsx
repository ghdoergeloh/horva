import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { FormattedMs } from "~/components/FormattedMinutes.js";
import { InlineNewSlotRow } from "~/components/InlineNewSlotRow.js";
import { InlineSlotRow } from "~/components/InlineSlotRow.js";
import { InsertSeparatorRow } from "~/components/InsertSeparatorRow.js";
import { fmt } from "~/lib/timeFormatters.js";

interface SlotRow {
  id: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  taskId: number | null;
  state: string;
  task?: {
    id: number;
    name: string;
    project: { name: string; color: string };
  } | null;
}

interface TaskOption {
  id: number;
  name: string;
  project: { name: string; color: string };
}

export function LogTable({
  slots,
  allTasks,
  hideGaps = false,
}: {
  slots: SlotRow[];
  allTasks: TaskOption[];
  hideGaps?: boolean;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [insertingAfterIndex, setInsertingAfterIndex] = useState<number | null>(
    null,
  );

  const referenceDate = slots[0] ? new Date(slots[0].startedAt) : new Date();

  function openInsert(afterIndex: number) {
    setEditingId(null);
    setInsertingAfterIndex(afterIndex);
  }

  function getInsertBounds(afterIndex: number): {
    prefillStart: Date | null;
    prefillEnd: Date | null;
  } {
    const prevSlot = slots[afterIndex];
    const nextSlot = slots[afterIndex + 1];
    return {
      prefillStart: prevSlot?.endedAt ? new Date(prevSlot.endedAt) : null,
      prefillEnd: nextSlot ? new Date(nextSlot.startedAt) : null,
    };
  }

  type TableRow =
    | { kind: "slot"; slot: SlotRow; slotIndex: number }
    | { kind: "gap"; from: Date; to: Date };

  const rows: TableRow[] = [];
  let slotIndex = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot) continue;

    if (!hideGaps && i > 0) {
      const prev = slots[i - 1];
      if (prev?.endedAt) {
        const gapMs =
          new Date(slot.startedAt).getTime() - new Date(prev.endedAt).getTime();
        if (gapMs > 60000) {
          rows.push({
            kind: "gap",
            from: new Date(prev.endedAt),
            to: new Date(slot.startedAt),
          });
        }
      }
    }

    rows.push({ kind: "slot", slot, slotIndex });
    slotIndex++;
  }

  const totalSlots = slotIndex;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
          <th className="pr-4 pb-2 font-normal">{t("logTable.from")}</th>
          <th className="pr-4 pb-2 font-normal">{t("logTable.until")}</th>
          <th className="pr-6 pb-2 font-normal">{t("logTable.time")}</th>
          <th className="pr-4 pb-2 font-normal" colSpan={2}>
            {t("logTable.task")}
          </th>
          <th className="w-6 pb-2" />
        </tr>
      </thead>
      <tbody>
        {insertingAfterIndex === -1 ? (
          <InlineNewSlotRow
            key="new-before-first"
            {...getInsertBounds(-1)}
            referenceDate={referenceDate}
            allTasks={allTasks}
            onCancel={() => setInsertingAfterIndex(null)}
            onSaved={() => setInsertingAfterIndex(null)}
          />
        ) : (
          <InsertSeparatorRow onInsert={() => openInsert(-1)} />
        )}

        {rows.map((row, i) => {
          if (row.kind === "gap") {
            return (
              <tr key={`gap-${String(i)}`} className="text-gray-300">
                <td className="py-1 pr-4 font-mono">{fmt(row.from)}</td>
                <td className="py-1 pr-4 font-mono">{fmt(row.to)}</td>
                <td className="py-1 pr-6 italic">
                  <FormattedMs ms={row.to.getTime() - row.from.getTime()} />
                </td>
                <td className="py-1 pr-4 italic" colSpan={2}>
                  {t("slot.gap")}
                </td>
                <td />
              </tr>
            );
          }

          const { slot, slotIndex: idx } = row;
          return (
            <React.Fragment key={slot.id}>
              <InlineSlotRow
                slot={slot}
                allTasks={allTasks}
                isEditing={editingId === slot.id}
                onStartEdit={() => {
                  setInsertingAfterIndex(null);
                  setEditingId(slot.id);
                }}
                onEndEdit={() => setEditingId(null)}
              />
              {insertingAfterIndex === idx ? (
                <InlineNewSlotRow
                  key={`new-after-${String(idx)}`}
                  {...getInsertBounds(idx)}
                  referenceDate={referenceDate}
                  allTasks={allTasks}
                  onCancel={() => setInsertingAfterIndex(null)}
                  onSaved={() => setInsertingAfterIndex(null)}
                />
              ) : (
                <InsertSeparatorRow onInsert={() => openInsert(idx)} />
              )}
            </React.Fragment>
          );
        })}

        {totalSlots > 0 && insertingAfterIndex === totalSlots - 1
          ? null
          : totalSlots === 0 && (
              <>
                {insertingAfterIndex === -1 ? null : (
                  <InsertSeparatorRow onInsert={() => openInsert(-1)} />
                )}
              </>
            )}
      </tbody>
    </table>
  );
}
