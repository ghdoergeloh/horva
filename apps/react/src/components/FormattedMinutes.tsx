import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";

export function FormattedMinutes({ minutes }: { minutes: number }) {
  const format = useTimeFormat();
  return <>{formatMinutesWithFormat(minutes, format)}</>;
}
