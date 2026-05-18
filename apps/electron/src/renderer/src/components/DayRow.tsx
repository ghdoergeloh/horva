import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EditSlotDialog } from "~/components/EditSlotDialog.js";
import { FormattedMs } from "~/components/FormattedMinutes.js";
import { LogTable } from "~/components/LogTable.js";
import { TaskSummaryView } from "~/components/TaskSummaryView.js";
import i18n from "~/i18n/index.js";
import { startOfDay } from "~/lib/dateUtils.js";
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

interface TooltipState {
  slot: SlotRow;
  x: number;
  y: number;
}

export interface DayRowProps {
  date: Date;
  slots: SlotRow[];
  allTasks: TaskOption[];
  minH: number;
  maxH: number;
  expanded: boolean;
  onToggle: () => void;
  viewMode: "slots" | "tasks";
  hideGaps: boolean;
}

export function DayRow({
  date,
  slots,
  allTasks,
  minH,
  maxH,
  expanded,
  onToggle,
  viewMode,
  hideGaps,
}: DayRowProps) {
  const { t } = useTranslation();
  const range = maxH - minH || 1;
  const isToday =
    startOfDay(date).getTime() === startOfDay(new Date()).getTime();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [editSlot, setEditSlot] = useState<SlotRow | null>(null);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  const totalMs = slots.reduce((acc, s) => {
    if (!s.endedAt) return acc;
    return (
      acc + new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
    );
  }, 0);

  return (
    <div
      className={`rounded-lg transition-colors ${isToday ? "bg-sidebar-accent/60" : expanded ? "bg-background" : ""}`}
    >
      {/* Timeline row – click to toggle */}
      <div
        className={`group flex cursor-pointer items-center gap-4 px-3 py-2 ${!isToday && !expanded ? "hover:bg-background" : ""} rounded-lg`}
        onClick={onToggle}
      >
        {/* Day label */}
        <div
          className={`w-16 shrink-0 text-right text-sm font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
        >
          {date.toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
          })}
        </div>

        {/* Timeline bar */}
        <div className="bg-muted relative h-9 flex-1 overflow-visible rounded-md">
          {Array.from({ length: maxH - minH - 1 }, (_, i) => {
            const left = ((i + 1) / range) * 100;
            return (
              <div
                key={i}
                style={{ left: `${String(left)}%` }}
                className="bg-card/60 absolute inset-y-0 w-px"
              />
            );
          })}

          {slots.map((slot) => {
            const start = new Date(slot.startedAt);
            const end = slot.endedAt ? new Date(slot.endedAt) : new Date();
            const startH = start.getHours() + start.getMinutes() / 60;
            const endH = end.getHours() + end.getMinutes() / 60;
            const left = ((startH - minH) / range) * 100;
            const width = Math.max(0.4, ((endH - startH) / range) * 100);
            const color =
              slot.state === "task_deleted"
                ? "#d1d5db"
                : (slot.task?.project.color ?? "#9ca3af");
            const isRunning = !slot.endedAt;

            return (
              <div
                key={slot.id}
                style={{
                  position: "absolute",
                  left: `${String(left)}%`,
                  width: `${String(width)}%`,
                  top: 5,
                  bottom: 5,
                  backgroundColor: color,
                }}
                className={`rounded transition-all hover:ring-2 hover:ring-white hover:ring-offset-1 hover:brightness-110 ${isRunning ? "animate-pulse" : ""}`}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    slot,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setTooltip(null);
                  setEditSlot(slot);
                }}
              />
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <div
              className="bg-foreground text-background pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg px-3 py-2 text-xs shadow-lg"
              style={{ left: tooltip.x, top: tooltip.y - 8 }}
            >
              <p className="font-medium">
                {tooltip.slot.task?.name ?? t("slot.noTask")}
              </p>
              {tooltip.slot.task && (
                <p className="text-muted-foreground mt-0.5">
                  {tooltip.slot.task.project.name}
                </p>
              )}
              <p className="text-muted-foreground/70 mt-1.5 font-mono">
                {fmt(tooltip.slot.startedAt)}
                {" – "}
                {tooltip.slot.endedAt
                  ? fmt(tooltip.slot.endedAt)
                  : t("slot.running")}
                {tooltip.slot.endedAt && (
                  <span className="text-muted-foreground ml-2">
                    <FormattedMs
                      ms={
                        new Date(tooltip.slot.endedAt).getTime() -
                        new Date(tooltip.slot.startedAt).getTime()
                      }
                    />
                  </span>
                )}
              </p>
              <p className="text-muted-foreground mt-1">
                {t("taskCard.clickToEdit")}
              </p>
            </div>
          )}
        </div>

        {/* Total duration */}
        <div className="text-muted-foreground w-16 shrink-0 text-right text-xs">
          {totalMs > 0 ? <FormattedMs ms={totalMs} /> : ""}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="pb-3">
          {slots.length === 0 ? (
            <p className="text-muted-foreground/70 px-4 text-sm">
              {t("slot.noEntries")}
            </p>
          ) : viewMode === "tasks" ? (
            <TaskSummaryView slots={slots} />
          ) : (
            <div className="px-4">
              <LogTable slots={slots} allTasks={allTasks} hideGaps={hideGaps} />
            </div>
          )}
        </div>
      )}

      {editSlot && (
        <EditSlotDialog slot={editSlot} onClose={() => setEditSlot(null)} />
      )}
    </div>
  );
}
