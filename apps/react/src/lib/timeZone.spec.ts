import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureValidLocalTimeZone, isValidTimeZone } from "#/lib/timeZone.js";

const proto = Intl.DateTimeFormat.prototype;
// oxlint-disable-next-line typescript/unbound-method
const realResolvedOptions = proto.resolvedOptions;

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
  });

  it("keeps a valid time zone", () => {
    ensureValidLocalTimeZone();

    const current = Object.getOwnPropertyDescriptor(proto, "resolvedOptions");
    expect(current?.value).toBe(realResolvedOptions);
  });

  it("reports UTC when the runtime zone is unknown", () => {
    vi.spyOn(proto, "resolvedOptions").mockImplementation(function (
      this: Intl.DateTimeFormat,
    ) {
      return { ...realResolvedOptions.call(this), timeZone: "Etc/Unknown" };
    });

    ensureValidLocalTimeZone();

    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");
  });
});
