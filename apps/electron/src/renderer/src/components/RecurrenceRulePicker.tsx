import { useState } from "react";
import { CalendarDate, fromDate, Time } from "@internationalized/date";
import { useTranslation } from "react-i18next";
import { RRule } from "rrule";

import { Button } from "@repo/ui/Button";
import { NumberField } from "@repo/ui/NumberField";
import { Select, SelectItem } from "@repo/ui/Select";
import { TimeField } from "@repo/ui/TimeField";

// ── Types ─────────────────────────────────────────────────────────────────────

type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

const WEEKDAYS = [
  { key: "MO", rrule: RRule.MO },
  { key: "TU", rrule: RRule.TU },
  { key: "WE", rrule: RRule.WE },
  { key: "TH", rrule: RRule.TH },
  { key: "FR", rrule: RRule.FR },
  { key: "SA", rrule: RRule.SA },
  { key: "SU", rrule: RRule.SU },
] as const;

const SETPOS_OPTIONS = [1, 2, 3, 4, -1] as const;

const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// All IANA timezone identifiers supported by the runtime
const ALL_TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (key: string) => string[] })
      .supportedValuesOf("timeZone")
      .sort();
  } catch {
    return [USER_TIMEZONE];
  }
})();

// ── Parse helpers ─────────────────────────────────────────────────────────────

interface RuleState {
  freq: Freq;
  interval: number;
  byWeekday: number[]; // 0=MO … 6=SU (RRule weekday index)
  monthlyMode: "byMonthDay" | "bySetPos";
  byMonthDay: number; // 1–31
  bySetPos: number; // 1,2,3,4,-1
  bySetPosDay: number; // 0=MO…6=SU
  date: CalendarDate | null;
  time: Time;
  tzid: string;
}

function defaultState(scheduledAt: Date | null): RuleState {
  const tzid = USER_TIMEZONE;
  const zdt = scheduledAt ? fromDate(scheduledAt, tzid) : null;
  const date = zdt ? new CalendarDate(zdt.year, zdt.month, zdt.day) : null;
  const time = zdt ? new Time(zdt.hour, zdt.minute) : new Time(9, 0);

  // JS getDay(): 0=Sun…6=Sat → RRule 0=MO…6=SU
  const jsDay = zdt ? zdt.toDate().getDay() : 0;
  const rruleDay = jsDay === 0 ? 6 : jsDay - 1;
  return {
    freq: "DAILY",
    interval: 1,
    byWeekday: [rruleDay],
    monthlyMode: "byMonthDay",
    byMonthDay: date?.day ?? 1,
    bySetPos: 1,
    bySetPosDay: rruleDay,
    date,
    time,
    tzid,
  };
}

function parseRruleString(
  rruleStr: string,
  scheduledAt: Date | null,
): RuleState {
  try {
    const rule = RRule.fromString(rruleStr);
    const o = rule.options;

    const freqMap: Record<number, Freq> = {
      [RRule.DAILY]: "DAILY",
      [RRule.WEEKLY]: "WEEKLY",
      [RRule.MONTHLY]: "MONTHLY",
      [RRule.YEARLY]: "YEARLY",
    };
    const freq: Freq =
      (freqMap as Record<number, Freq | undefined>)[o.freq] ?? "DAILY";

    const byWeekday = (
      (o.byweekday as unknown as (number | { weekday: number })[] | null) ?? []
    ).map((w) => (typeof w === "number" ? w : w.weekday));

    const bysetpos = (o.bysetpos as unknown as number[] | null) ?? [];
    const bymonthday = (o.bymonthday as unknown as number[] | null) ?? [];
    const bySetPos = bysetpos[0] ?? 1;
    const bySetPosDay = byWeekday[0] ?? 0;
    const monthlyMode = bysetpos.length > 0 ? "bySetPos" : "byMonthDay";

    const tzid = o.tzid ?? USER_TIMEZONE;
    // o.dtstart has UTC fields == wall-clock in tzid (rrule convention)
    const rawDtstart = o.dtstart as Date | null;
    let date: CalendarDate | null = null;
    let time = new Time(9, 0);
    if (rawDtstart) {
      // rrule stores wall-clock digits in UTC fields — read them directly
      date = new CalendarDate(
        rawDtstart.getUTCFullYear(),
        rawDtstart.getUTCMonth() + 1,
        rawDtstart.getUTCDate(),
      );
      time = new Time(rawDtstart.getUTCHours(), rawDtstart.getUTCMinutes());
    } else if (scheduledAt) {
      const zdt = fromDate(scheduledAt, tzid);
      date = new CalendarDate(zdt.year, zdt.month, zdt.day);
      time = new Time(zdt.hour, zdt.minute);
    }

    return {
      freq,
      interval: o.interval,
      byWeekday,
      monthlyMode,
      byMonthDay: bymonthday[0] ?? date?.day ?? 1,
      bySetPos,
      bySetPosDay,
      date,
      time,
      tzid,
    };
  } catch {
    return defaultState(scheduledAt);
  }
}

function buildRrule(state: RuleState): string {
  const base =
    state.date ??
    (() => {
      const zdt = fromDate(new Date(), state.tzid);
      return new CalendarDate(zdt.year, zdt.month, zdt.day);
    })();

  // rrule with tzid stores wall-clock digits directly in UTC fields.
  const dtstart = new Date(
    Date.UTC(
      base.year,
      base.month - 1,
      base.day,
      state.time.hour,
      state.time.minute,
    ),
  );

  let byweekday: (typeof RRule.MO)[] | undefined;
  if (state.freq === "WEEKLY" && state.byWeekday.length > 0) {
    byweekday = state.byWeekday.map((i) => {
      const day = WEEKDAYS[i];
      if (!day) throw new Error(`Invalid weekday index: ${String(i)}`);
      return day.rrule;
    });
  } else if (state.freq === "MONTHLY" && state.monthlyMode === "bySetPos") {
    const day = WEEKDAYS[state.bySetPosDay];
    if (!day)
      throw new Error(`Invalid weekday index: ${String(state.bySetPosDay)}`);
    byweekday = [day.rrule];
  }

  const rule = new RRule({
    freq:
      state.freq === "DAILY"
        ? RRule.DAILY
        : state.freq === "WEEKLY"
          ? RRule.WEEKLY
          : state.freq === "MONTHLY"
            ? RRule.MONTHLY
            : RRule.YEARLY,
    interval: state.interval,
    byweekday,
    bymonthday:
      state.freq === "MONTHLY" && state.monthlyMode === "byMonthDay"
        ? [state.byMonthDay]
        : undefined,
    bysetpos:
      state.freq === "MONTHLY" && state.monthlyMode === "bySetPos"
        ? [state.bySetPos]
        : undefined,
    dtstart,
    tzid: state.tzid,
  });

  return rule.toString();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RecurrenceRulePickerProps {
  value: string | null;
  scheduledAt: Date | null;
  onChange: (rule: string | null) => void;
}

export function RecurrenceRulePicker({
  value,
  scheduledAt,
  onChange,
}: RecurrenceRulePickerProps) {
  const { t } = useTranslation();
  const enabled = value !== null;
  const [tzExpanded, setTzExpanded] = useState(false);

  const [state, setState] = useState<RuleState>(() =>
    value ? parseRruleString(value, scheduledAt) : defaultState(scheduledAt),
  );
  function update(partial: Partial<RuleState>) {
    const next = { ...state, ...partial };
    setState(next);
    if (enabled) {
      try {
        onChange(buildRrule(next));
      } catch {
        // ignore transient invalid states
      }
    }
  }

  function toggleEnabled() {
    if (enabled) {
      onChange(null);
    } else {
      const tzid = state.tzid;
      const zdt = scheduledAt ? fromDate(scheduledAt, tzid) : null;
      const date = zdt
        ? new CalendarDate(zdt.year, zdt.month, zdt.day)
        : state.date;
      const next = { ...state, date };
      setState(next);
      onChange(buildRrule(next));
    }
  }

  const freqLabel: Record<Freq, string> = {
    DAILY: t("recurrence.daily"),
    WEEKLY: t("recurrence.weekly"),
    MONTHLY: t("recurrence.monthly"),
    YEARLY: t("recurrence.yearly"),
  };

  const setposLabel: Record<number, string> = {
    1: t("recurrence.first"),
    2: t("recurrence.second"),
    3: t("recurrence.third"),
    4: t("recurrence.fourth"),
    [-1]: t("recurrence.last"),
  };

  const locale = t("language.de") === "Deutsch" ? "de-DE" : "en-US";

  // Short display label: e.g. "Europe/Berlin" → "Berlin"
  const tzShortLabel =
    state.tzid.split("/").at(-1)?.replace(/_/g, " ") ?? state.tzid;

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <Button
        variant="quiet"
        onPress={toggleEnabled}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-sm border ${enabled ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}
        />
        {enabled ? t("recurrence.repeats") : t("recurrence.doesNotRepeat")}
      </Button>

      {/* Rule builder */}
      {enabled && (
        <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          {/* Frequency */}
          <div className="flex flex-wrap gap-1">
            {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as Freq[]).map((f) => (
              <Button
                key={f}
                variant={state.freq === f ? "primary" : "secondary"}
                onPress={() => update({ freq: f })}
                className="px-2 py-0.5 text-xs"
              >
                {freqLabel[f]}
              </Button>
            ))}
          </div>

          {/* Time + Timezone */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {t("taskEditControls.planTime")}
            </span>
            <TimeField
              value={state.time}
              onChange={(v) => {
                if (v) update({ time: v });
              }}
              className="**:data-[slot=date-input]:h-7 **:data-[slot=date-input]:min-w-0 **:data-[slot=date-input]:rounded **:data-[slot=date-input]:px-2 **:data-[slot=date-input]:py-0 **:data-[slot=date-input]:text-xs"
            />
            {/* Timezone — subtle, expands to Select on click */}
            {tzExpanded ? (
              <Select<{ id: string; name: string }>
                aria-label={t("recurrence.timezone")}
                value={state.tzid}
                onChange={(key) => {
                  if (key !== null) update({ tzid: String(key) });
                  setTzExpanded(false);
                }}
                onOpenChange={(isOpen) => {
                  if (!isOpen) setTzExpanded(false);
                }}
                items={ALL_TIMEZONES.map((tz) => ({ id: tz, name: tz }))}
                className="min-w-0 [&_button]:h-7 [&_button]:min-w-[160px] [&_button]:text-xs"
              >
                {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
              </Select>
            ) : (
              <button
                type="button"
                title={t("recurrence.timezone")}
                onClick={() => setTzExpanded(true)}
                className="cursor-pointer rounded px-1 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {tzShortLabel}
              </button>
            )}
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {t("recurrence.every")}
            </span>
            <NumberField
              aria-label={t("recurrence.every")}
              value={state.interval}
              minValue={1}
              maxValue={99}
              onChange={(v) => update({ interval: Math.max(1, v || 1) })}
              className="**:data-[slot=field-group]:h-7 **:data-[slot=field-group]:text-xs [&_input]:w-10 [&_input]:text-center [&_input]:text-xs"
            />
            <span className="text-xs text-gray-600">
              {state.freq === "DAILY"
                ? t("recurrence.days")
                : state.freq === "WEEKLY"
                  ? t("recurrence.weeks")
                  : state.freq === "MONTHLY"
                    ? t("recurrence.months")
                    : t("recurrence.years")}
            </span>
          </div>

          {/* Weekly: day-of-week checkboxes */}
          {state.freq === "WEEKLY" && (
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((wd, i) => {
                const selected = state.byWeekday.includes(i);
                const label = new Date(2024, 0, 1 + i).toLocaleDateString(
                  locale,
                  { weekday: "short" },
                );
                return (
                  <Button
                    key={wd.key}
                    variant={selected ? "primary" : "secondary"}
                    onPress={() => {
                      const next = selected
                        ? state.byWeekday.filter((d) => d !== i)
                        : [...state.byWeekday, i].sort();
                      if (next.length > 0) update({ byWeekday: next });
                    }}
                    className="px-2 py-0.5 text-xs"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Monthly: day vs. position */}
          {state.freq === "MONTHLY" && (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                <input
                  type="radio"
                  checked={state.monthlyMode === "byMonthDay"}
                  onChange={() => update({ monthlyMode: "byMonthDay" })}
                  className="accent-indigo-500"
                />
                <span>{t("recurrence.onDay")}</span>
                <NumberField
                  aria-label={t("recurrence.onDay")}
                  value={state.byMonthDay}
                  minValue={1}
                  maxValue={31}
                  isDisabled={state.monthlyMode !== "byMonthDay"}
                  onChange={(v) =>
                    update({ byMonthDay: Math.min(31, Math.max(1, v || 1)) })
                  }
                  className="**:data-[slot=field-group]:h-7 [&_input]:w-10 [&_input]:text-center [&_input]:text-xs"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                <input
                  type="radio"
                  checked={state.monthlyMode === "bySetPos"}
                  onChange={() => update({ monthlyMode: "bySetPos" })}
                  className="accent-indigo-500"
                />
                <span>{t("recurrence.onThe")}</span>
                <Select<{ id: string; label: string }>
                  aria-label={t("recurrence.onThe")}
                  value={String(state.bySetPos)}
                  isDisabled={state.monthlyMode !== "bySetPos"}
                  onChange={(key) => {
                    if (key !== null)
                      update({ bySetPos: parseInt(String(key)) });
                  }}
                  items={SETPOS_OPTIONS.map((pos) => ({
                    id: String(pos),
                    label:
                      (setposLabel as Record<number, string | undefined>)[
                        pos
                      ] ?? String(pos),
                  }))}
                  className="[&_button]:h-7 [&_button]:min-w-[90px] [&_button]:text-xs"
                >
                  {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
                </Select>
                <Select<{ id: string; label: string }>
                  aria-label={t("recurrence.onThe")}
                  value={String(state.bySetPosDay)}
                  isDisabled={state.monthlyMode !== "bySetPos"}
                  onChange={(key) => {
                    if (key !== null)
                      update({ bySetPosDay: parseInt(String(key)) });
                  }}
                  items={WEEKDAYS.map((_wd, i) => ({
                    id: String(i),
                    label: new Date(2024, 0, 1 + i).toLocaleDateString(locale, {
                      weekday: "long",
                    }),
                  }))}
                  className="[&_button]:h-7 [&_button]:min-w-[100px] [&_button]:text-xs"
                >
                  {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
                </Select>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
