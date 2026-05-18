import { useEffect, useState } from "react";
import { Play, Square, SwitchCamera } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";

import { useActiveSlot } from "~/contexts/ActiveSlotContext.js";
import { StartTaskDialog } from "./StartTaskDialog.js";
import { WorktimeDisplay } from "./WorktimeDisplay.js";

function formatDuration(startedAt: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${String(h)}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SlotBar() {
  const { t } = useTranslation();
  const { openSlot, invalidate } = useActiveSlot();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [switchMode, setSwitchMode] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!openSlot) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [openSlot]);

  async function handleStop() {
    await window.api.slots.done();
    await invalidate();
  }

  if (!openSlot) {
    return (
      <div className="border-border bg-card flex items-center gap-3 border-b px-6 py-3">
        <span className="text-muted-foreground text-sm">
          {t("slotBar.notWorking")}
        </span>
        <Button
          variant="primary"
          onPress={() => {
            setSwitchMode(false);
            setShowStartDialog(true);
          }}
          className="px-3 py-1.5 text-sm"
        >
          <span className="inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {t("slotBar.startWork")}
          </span>
        </Button>
        <div className="ml-auto">
          <WorktimeDisplay tick={tick} />
        </div>
        {showStartDialog && (
          <StartTaskDialog
            onClose={() => setShowStartDialog(false)}
            onStarted={async () => {
              await invalidate();
              setShowStartDialog(false);
            }}
          />
        )}
      </div>
    );
  }

  const task = openSlot.task;
  const projectColor = task?.project.color ?? "#9ca3af";

  return (
    <div className="border-border bg-card flex items-center gap-4 border-b px-6 py-3">
      {/* Color dot */}
      <div
        className="h-3 w-3 flex-shrink-0 rounded-full"
        style={{ backgroundColor: projectColor }}
      />

      {/* Task info */}
      <div className="min-w-0 flex-1">
        {task ? (
          <div className="flex items-center gap-2">
            <span className="text-foreground truncate text-sm font-medium">
              {task.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {task.project.name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            {t("slotBar.noTask")}
          </span>
        )}
      </div>

      {/* Elapsed */}
      <span className="text-foreground/90 font-mono text-sm tabular-nums">
        {formatDuration(openSlot.startedAt)}
      </span>

      <div className="bg-border h-4 w-px" />
      <WorktimeDisplay tick={tick} />

      {/* Switch task */}
      <Button
        variant="secondary"
        onPress={() => {
          setSwitchMode(true);
          setShowStartDialog(true);
        }}
        className="px-3 py-1.5 text-sm"
        aria-label={t("slotBar.switchTask")}
      >
        <span className="inline-flex items-center gap-1.5">
          <SwitchCamera className="h-3.5 w-3.5" />
          {t("slotBar.switchTask")}
        </span>
      </Button>

      {/* Pause — ends the current slot */}
      <Button
        variant="destructive"
        onPress={() => void handleStop()}
        className="px-3 py-1.5 text-sm font-medium"
      >
        <span className="inline-flex items-center gap-1.5">
          <Square className="h-3.5 w-3.5" />
          {t("slotBar.stop")}
        </span>
      </Button>

      {showStartDialog && (
        <StartTaskDialog
          switchMode={switchMode}
          onClose={() => setShowStartDialog(false)}
          onStarted={async () => {
            await invalidate();
            setShowStartDialog(false);
          }}
        />
      )}
    </div>
  );
}
