import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const proto = Intl.DateTimeFormat.prototype;
// oxlint-disable-next-line typescript/unbound-method
const realResolvedOptions = proto.resolvedOptions;

describe("RecurrenceRulePicker in a runtime with an unknown time zone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    proto.resolvedOptions = realResolvedOptions;
    vi.resetModules();
  });

  it("renders after the app has replaced the zone with UTC", async () => {
    vi.spyOn(proto, "resolvedOptions").mockImplementation(function (
      this: Intl.DateTimeFormat,
    ) {
      return { ...realResolvedOptions.call(this), timeZone: "Etc/Unknown" };
    });
    vi.resetModules();

    // The app imports its components before App.tsx fixes the zone.
    const { RecurrenceRulePicker } =
      await import("#/components/RecurrenceRulePicker.js");
    const { ensureValidLocalTimeZone } = await import("#/lib/timeZone.js");
    ensureValidLocalTimeZone();

    const html = renderToString(
      <RecurrenceRulePicker
        value="FREQ=WEEKLY;BYDAY=MO"
        scheduledAt={new Date("2026-03-02T08:00:00Z")}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain(': UTC"');
    expect(html).not.toContain("Etc/Unknown");
  });
});
