import { useEffect, useState } from "react";

import { fmtDuration } from "~/lib/timeFormatters.js";

export function LiveTime({ startedAt }: { startedAt: Date | string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <span>{fmtDuration(now.getTime() - new Date(startedAt).getTime())}</span>
  );
}
