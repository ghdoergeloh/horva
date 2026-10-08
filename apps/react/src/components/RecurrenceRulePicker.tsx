import { useState } from "react";
import { CalendarDate, fromDate, Time } from "@internationalized/date";
import { useTranslation } from "react-i18next";
import { RRule } from "rrule";

import { Button } from "@horva/ui/Button";
import { NumberField } from "@horva/ui/NumberField";
import { Radio, RadioGroup } from "@horva/ui/RadioGroup";
import { Select, SelectItem } from "@horva/ui/Select";
import { Switch } from "@horva/ui/Switch";
import { TimeField } from "@horva/ui/TimeField";
import { ToggleButton } from "@horva/ui/ToggleButton";
import { ToggleButtonGroup } from "@horva/ui/ToggleButtonGroup";

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

  const unit =
    state.freq === "DAILY"
      ? t("recurrence.days")
      : state.freq === "WEEKLY"
        ? t("recurrence.weeks")
        : state.freq === "MONTHLY"
          ? t("recurrence.months")
          : t("recurrence.years");

  return (
    <div className="space-y-3">
      <Switch isSelected={enabled} onChange={toggleEnabled}>
        {enabled ? t("recurrence.repeats") : t("recurrence.doesNotRepeat")}
      </Switch>

      {enabled && (
        <div className="border-border bg-background space-y-4 rounded-lg border p-3">
          <ToggleButtonGroup
            variant="segmented"
            aria-label={t("recurrence.frequency")}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[state.freq]}
            onSelectionChange={(keys) => {
              const [next] = keys;
              if (next !== undefined) update({ freq: String(next) as Freq });
            }}
            className="max-w-full flex-wrap"
          >
            {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as Freq[]).map((f) => (
              <ToggleButton key={f} id={f}>
                {freqLabel[f]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm">
              {t("recurrence.every")}
            </span>
            <NumberField
              aria-label={`${t("recurrence.every")} (${unit})`}
              value={state.interval}
              minValue={1}
              maxValue={99}
              onChange={(v) => update({ interval: Math.max(1, v || 1) })}
              className="w-24"
            />
            <span className="text-foreground text-sm">{unit}</span>
          </div>

          {state.freq === "WEEKLY" && (
            <ToggleButtonGroup
              aria-label={t("recurrence.weekdays")}
              selectionMode="multiple"
              disallowEmptySelection
              selectedKeys={state.byWeekday.map(String)}
              onSelectionChange={(keys) => {
                const next = [...keys].map(Number).sort();
                if (next.length > 0) update({ byWeekday: next });
              }}
              className="flex-wrap"
            >
              {WEEKDAYS.map((wd, i) => (
                <ToggleButton
                  key={wd.key}
                  id={String(i)}
                  className="h-7.5 min-w-10 px-2 text-sm"
                >
                  {new Date(2024, 0, 1 + i).toLocaleDateString(locale, {
                    weekday: "short",
                  })}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          {state.freq === "MONTHLY" && (
            <RadioGroup
              label={t("recurrence.monthlyMode")}
              value={state.monthlyMode}
              onChange={(mode) =>
                update({ monthlyMode: mode as RuleState["monthlyMode"] })
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <Radio value="byMonthDay">{t("recurrence.onDay")}</Radio>
                <NumberField
                  aria-label={t("recurrence.onDay")}
                  value={state.byMonthDay}
                  minValue={1}
                  maxValue={31}
                  isDisabled={state.monthlyMode !== "byMonthDay"}
                  onChange={(v) =>
                    update({ byMonthDay: Math.min(31, Math.max(1, v || 1)) })
                  }
                  className="w-24"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Radio value="bySetPos">{t("recurrence.onThe")}</Radio>
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
                  className="w-28"
                >
                  {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
                </Select>
                <Select<{ id: string; label: string }>
                  aria-label={t("recurrence.weekdays")}
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
                  className="w-36"
                >
                  {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
                </Select>
              </div>
            </RadioGroup>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <TimeField
              label={t("taskEditControls.planTime")}
              value={state.time}
              onChange={(v) => {
                if (v) update({ time: v });
              }}
            />
            {tzExpanded ? (
              <Select<{ id: string; name: string }>
                label={t("recurrence.timezone")}
                value={state.tzid}
                onChange={(key) => {
                  if (key !== null) update({ tzid: String(key) });
                  setTzExpanded(false);
                }}
                onOpenChange={(isOpen) => {
                  if (!isOpen) setTzExpanded(false);
                }}
                items={ALL_TIMEZONES.map((tz) => ({ id: tz, name: tz }))}
                className="min-w-48"
              >
                {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
              </Select>
            ) : (
              <Button
                variant="quiet"
                size="sm"
                onPress={() => setTzExpanded(true)}
                aria-label={`${t("recurrence.timezone")}: ${state.tzid}`}
                className="text-muted-foreground self-end"
              >
                {tzShortLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
