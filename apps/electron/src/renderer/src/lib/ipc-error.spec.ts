import { describe, expect, it } from "vitest";

import { ipcErrorMessage } from "./ipc-error";

describe("ipcErrorMessage", () => {
  it("removes the prefix that Electron adds", () => {
    const err = new Error(
      "Error invoking remote method 'setup:complete': Error: Database URL must be a postgres:// URL",
    );
    expect(ipcErrorMessage(err)).toBe("Database URL must be a postgres:// URL");
  });

  it("removes the prefix of other error classes", () => {
    const err = new Error(
      "Error invoking remote method 'setup:retry': TypeError: fetch failed",
    );
    expect(ipcErrorMessage(err)).toBe("fetch failed");
  });

  it("keeps other messages as they are", () => {
    expect(ipcErrorMessage(new Error("connect ECONNREFUSED"))).toBe(
      "connect ECONNREFUSED",
    );
    expect(ipcErrorMessage("plain")).toBe("plain");
  });
});
