import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { TimerBar } from "@horva/ui/TimerBar";

import { useActiveSlot } from "#/contexts/ActiveSlotContext.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import { StartTaskDialog } from "./StartTaskDialog.js";

/** The current time, updated every second while `isTicking` is true. */
function useNow(isTicking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isTicking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTicking]);
  return now;
}

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
  const now = useNow(Boolean(openSlot));
  const todayLogged = useLoggedMinutes("today");
  const weekLogged = useLoggedMinutes("week");

  const elapsedSeconds = openSlot
    ? Math.max(
        0,
        Math.floor((now - new Date(openSlot.startedAt).getTime()) / 1000),
      )
    : 0;
  const runningMinutes = Math.floor(elapsedSeconds / 60);
  const task = openSlot?.task;

  async function handleStop() {
    await client.slot.done({});
    await invalidate();
  }

  return (
    <>
      <TimerBar
        running={
          openSlot
            ? {
                taskName: task?.name ?? t("slotBar.noTask"),
                project: task ? task.project : null,
                elapsedSeconds,
              }
            : null
        }
        todayMinutes={todayLogged + runningMinutes}
        weekMinutes={weekLogged + runningMinutes}
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
      <StartTaskDialog
        isOpen={dialog !== null}
        switchMode={dialog === "switch"}
        currentTaskId={task?.id ?? null}
        onClose={() => setDialog(null)}
        onStarted={async () => {
          await invalidate();
          setDialog(null);
        }}
      />
    </>
  );
}
