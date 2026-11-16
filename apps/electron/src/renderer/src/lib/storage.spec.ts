import { describe, expect, it } from "vitest";

import { folderOf, initialStorage } from "./storage";

const LOCAL = "file:///Users/robin/Library/Application%20Support/Horva/data";

describe("initialStorage", () => {
  it("offers the app's own folder on a first setup", () => {
    expect(initialStorage(LOCAL, LOCAL)).toEqual({
      storage: "local",
      localUrl: LOCAL,
      serverUrl: "",
    });
  });

  it("keeps a folder that is already configured", () => {
    expect(initialStorage("file:///Users/robin/horva", LOCAL)).toEqual({
      storage: "local",
      localUrl: "file:///Users/robin/horva",
      serverUrl: "",
    });
  });

  it("keeps a configured server", () => {
    expect(initialStorage("postgresql://db/horva", LOCAL)).toEqual({
      storage: "server",
      localUrl: LOCAL,
      serverUrl: "postgresql://db/horva",
    });
  });
});

describe("folderOf", () => {
  it("shows the path of a file URL", () => {
    expect(folderOf(LOCAL)).toBe(
      "/Users/robin/Library/Application Support/Horva/data",
    );
  });
});
