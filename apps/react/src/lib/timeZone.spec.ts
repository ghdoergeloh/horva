import {
  getLocalTimeZone,
  resetLocalTimeZone,
  setLocalTimeZone,
} from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureValidLocalTimeZone, isValidTimeZone } from "#/lib/timeZone.js";

const proto = Intl.DateTimeFormat.prototype;
// oxlint-disable-next-line typescript/unbound-method
const realResolvedOptions = proto.resolvedOptions;

/** The zone of the machine that runs the tests. */
const machineZone = realResolvedOptions.call(
  new Intl.DateTimeFormat(),
).timeZone;
/** A valid zone that differs from the machine zone. */
const otherZone = machineZone === "Asia/Tokyo" ? "Europe/Berlin" : "Asia/Tokyo";

/** Makes the runtime report `zone` for formatters without an explicit zone. */
function reportRuntimeZone(zone: string) {
  vi.spyOn(proto, "resolvedOptions").mockImplementation(function (
    this: Intl.DateTimeFormat,
  ) {
    const options = realResolvedOptions.call(this);
    return options.timeZone === machineZone
      ? { ...options, timeZone: zone }
      : options;
  });
}

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects unknown ones", () => {
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Etc/Unknown")).toBe(false);
  });
});

describe("ensureValidLocalTimeZone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    proto.resolvedOptions = realResolvedOptions;
    resetLocalTimeZone();
  });

  it("keeps a valid time zone", () => {
    reportRuntimeZone(otherZone);
    const before = Object.getOwnPropertyDescriptor(proto, "resolvedOptions");

    ensureValidLocalTimeZone();

    const after = Object.getOwnPropertyDescriptor(proto, "resolvedOptions");
    expect(after?.value).toBe(before?.value);
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      otherZone,
    );
  });

  it("reports UTC when the runtime zone is unknown", () => {
    reportRuntimeZone("Etc/Unknown");

    ensureValidLocalTimeZone();

    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");
  });

  it("keeps a zone that a formatter sets explicitly", () => {
    reportRuntimeZone("Etc/Unknown");

    ensureValidLocalTimeZone();

    const explicit = new Intl.DateTimeFormat("en-US", { timeZone: otherZone });
    expect(explicit.resolvedOptions().timeZone).toBe(otherZone);
  });

  it("replaces a zone that @internationalized/date has already stored", () => {
    reportRuntimeZone("Etc/Unknown");
    setLocalTimeZone("Etc/Unknown");

    ensureValidLocalTimeZone();

    expect(getLocalTimeZone()).toBe("UTC");
  });
});
