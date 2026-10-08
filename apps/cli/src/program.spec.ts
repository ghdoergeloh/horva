import { describe, expect, it, vi } from "vitest";

import type { CliDeps } from "./program";
import { createProgram } from "./program";

function run(args: string[], deps: Partial<CliDeps> = {}) {
  const lines: string[] = [];
  const program = createProgram({
    log: (line) => lines.push(line),
    databaseUrl: () => "postgresql://unused@localhost/unused",
    migrate: () => Promise.resolve(),
    close: () => Promise.resolve(),
    ...deps,
  }).exitOverride();
  return { lines, done: program.parseAsync(["node", "horva", ...args]) };
}

describe("cli", () => {
  it("registers the command groups", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).toEqual(
      expect.arrayContaining([
        "init",
        "label",
        "log",
        "migrate",
        "project",
        "task",
      ]),
    );
  });

  it("migrates the configured database and closes it", async () => {
    const migrate = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => Promise.resolve());
    const { lines, done } = run(["migrate"], { migrate, close });
    await done;
    expect(migrate).toHaveBeenCalledWith(
      "postgresql://unused@localhost/unused",
    );
    expect(lines).toEqual(["Migrations applied"]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("refuses to migrate without a database URL", async () => {
    await expect(
      run(["migrate"], { databaseUrl: () => undefined }).done,
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
