import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { TimerBar } from "@horva/ui/TimerBar";

import { useActiveSlot } from "#/contexts/ActiveSlotContext.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import { useNow } from "#/lib/useNow.js";
import { StartTaskDialog } from "./StartTaskDialog.js";
import { elapsedSeconds, workedMinutes } from "./timerRules.js";

/** The minutes of all closed slots in a period, from the log summary. */
function useLoggedMinutes(period: "today" | "week"): number {
  const { data } = useQuery({
    queryKey: ["log", "summary", period],
    queryFn: async () => {
      const res = await client.log.summary({ period });
      return res.summary;
    },
    refetchInterval: 60_000,
  });
  return data?.reduce((sum, entry) => sum + entry.totalMinutes, 0) ?? 0;
}

/**
 * The timer at the top of the main area: what runs now, for how long, and
 * the time worked today and this week. "Start work" and "Switch" open the
 * task picker; "Stop" ends the work.
 */
export function SlotBar() {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const { openSlot, invalidate } = useActiveSlot();
  const [dialog, setDialog] = useState<"start" | "switch" | null>(null);
  const now = useNow(1000, Boolean(openSlot)).getTime();
  const todayLogged = useLoggedMinutes("today");
  const weekLogged = useLoggedMinutes("week");

  const [stopFailed, setStopFailed] = useState(false);
  const seconds = elapsedSeconds(openSlot?.startedAt, now);
  const task = openSlot?.task;

  async function handleStop() {
    setStopFailed(false);
    try {
      await client.slot.done({});
      await invalidate();
    } catch {
      setStopFailed(true);
    }
  }

  return (
    <>
      <TimerBar
        running={
          openSlot
            ? {
                taskName: task?.name ?? t("slotBar.noTask"),
                project: task ? task.project : null,
                elapsedSeconds: seconds,
              }
            : null
        }
        todayMinutes={workedMinutes(todayLogged, seconds)}
        weekMinutes={workedMinutes(weekLogged, seconds)}
        onStart={() => setDialog("start")}
        onSwitch={() => setDialog("switch")}
        onStop={() => void handleStop()}
        formatDuration={(minutes) =>
          formatMinutesWithFormat(minutes, timeFormat)
        }
        strings={{
          idle: t("slotBar.notWorking"),
          start: t("slotBar.startWork"),
          switch: t("slotBar.switchTask"),
          stop: t("slotBar.stop"),
          today: t("worktime.today"),
          week: t("worktime.week"),
          region: t("slotBar.region"),
          running: t("slotBar.running"),
          noProject: t("slotBar.noProject"),
        }}
      />
      {stopFailed && (
        <p role="alert" className="text-destructive text-small mt-2">
          {t("slotBar.stopFailed")}
        </p>
      )}
      <StartTaskDialog
        isOpen={dialog !== null}
        switchMode={dialog === "switch"}
        current={openSlot ? (task?.id ?? null) : undefined}
        onClose={() => setDialog(null)}
        onStarted={async () => {
          await invalidate();
          setDialog(null);
        }}
      />
    </>
  );
}
