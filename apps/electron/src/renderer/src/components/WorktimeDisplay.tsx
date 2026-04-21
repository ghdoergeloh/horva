import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { FormattedMinutes } from "~/components/FormattedMinutes.js";
import { useActiveSlot } from "~/contexts/ActiveSlotContext.js";
import { client } from "~/lib/orpc.js";

function elapsedMinutes(startedAt: Date | string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
}

export function WorktimeDisplay({ tick }: { tick: number }) {
  // suppress unused warning — tick forces re-render every second when slot is running
  void tick;

  const { t } = useTranslation();
  const { openSlot } = useActiveSlot();

  const { data: todaySummary } = useQuery({
    queryKey: ["log", "summary", "today"],
    queryFn: async () => {
      const res = await client.log.summary({ period: "today" });
      return res.summary;
    },
    refetchInterval: 60_000,
  });

  const { data: weekSummary } = useQuery({
    queryKey: ["log", "summary", "week"],
    queryFn: async () => {
      const res = await client.log.summary({ period: "week" });
      return res.summary;
    },
    refetchInterval: 60_000,
  });

  const committedTodayMinutes =
    todaySummary?.reduce((sum, e) => sum + e.totalMinutes, 0) ?? 0;
  const committedWeekMinutes =
    weekSummary?.reduce((sum, e) => sum + e.totalMinutes, 0) ?? 0;

  // Add the currently running slot's elapsed time
  const runningMinutes = openSlot ? elapsedMinutes(openSlot.startedAt) : 0;

  const todayMinutes = committedTodayMinutes + runningMinutes;
  const weekMinutes = committedWeekMinutes + runningMinutes;

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">{t("worktime.today")}</span>
        <span className="font-mono font-medium text-gray-700 tabular-nums">
          <FormattedMinutes minutes={todayMinutes} />
        </span>
      </div>
      <div className="h-3 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">{t("worktime.week")}</span>
        <span className="font-mono font-medium text-gray-700 tabular-nums">
          <FormattedMinutes minutes={weekMinutes} />
        </span>
      </div>
    </div>
  );
}
