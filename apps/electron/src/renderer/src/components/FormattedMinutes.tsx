import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "~/contexts/SettingsContext.js";

export function FormattedMinutes({ minutes }: { minutes: number }) {
  const format = useTimeFormat();
  return <>{formatMinutesWithFormat(minutes, format)}</>;
}

export function FormattedMs({ ms }: { ms: number }) {
  return <FormattedMinutes minutes={Math.round(ms / 60000)} />;
}
