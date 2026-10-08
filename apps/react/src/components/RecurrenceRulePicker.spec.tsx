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

  it("renders after App.tsx has replaced the zone with UTC", async () => {
    vi.spyOn(proto, "resolvedOptions").mockImplementation(function (
      this: Intl.DateTimeFormat,
    ) {
      return { ...realResolvedOptions.call(this), timeZone: "Etc/Unknown" };
    });
    // Without this list, the picker reads the local zone while it loads.
    vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new RangeError("not supported");
    });
    vi.resetModules();

    // App.tsx imports the picker first and then fixes the zone.
    await import("#/App.js");
    const { RecurrenceRulePicker } =
      await import("#/components/RecurrenceRulePicker.js");
    const { getLocalTimeZone, resetLocalTimeZone } =
      await import("@internationalized/date");
    expect(getLocalTimeZone()).toBe("UTC");

    const html = renderToString(
      <RecurrenceRulePicker
        value="FREQ=WEEKLY;BYDAY=MO"
        scheduledAt={new Date("2026-03-02T08:00:00Z")}
        onChange={() => undefined}
      />,
    );
    resetLocalTimeZone();

    expect(html).toContain(': UTC"');
    expect(html).not.toContain("Etc/Unknown");
  });
});
