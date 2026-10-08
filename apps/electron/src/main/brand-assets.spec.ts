import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

/**
 * The boot screen in index.html shows before any CSS of the app, so it
 * repeats a few colors of the theme. This keeps them equal to the tokens.
 */
const html = read("apps/electron/src/renderer/index.html");
const theme = read("tooling/tailwind/theme.css");

function token(name: string, dark: boolean): string {
  const darkStart = theme.indexOf("@variant dark {");
  const part = dark ? theme.slice(darkStart) : theme.slice(0, darkStart);
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(part);
  if (!match?.[1]) throw new Error(`--${name} not found`);
  return match[1].trim();
}

/** The values of one declaration in html, in order (light, dark, dark). */
function boot(name: string): string[] {
  return [...html.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g"))].map((m) =>
    (m[1] ?? "").trim(),
  );
}

describe("boot screen colors", () => {
  it.each([
    ["--boot-ink", "primary"],
    ["--boot-running", "running"],
    ["--boot-muted", "muted-foreground"],
    ["background", "background"],
  ])("%s follows --%s", (bootName, tokenName) => {
    const [light, ...dark] = boot(bootName);
    expect(light).toBe(token(tokenName, false));
    expect(dark).toEqual(dark.map(() => token(tokenName, true)));
    expect(dark.length).toBe(2);
  });
});

describe("boot screen variables", () => {
  // The boot screen sets its variables on <html> and <body>. A name the
  // theme also uses (`--muted`, `--running`, …) would override that
  // token for the whole app.
  it("uses only its own --boot-* names", () => {
    const style = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";
    const names = [...style.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name?.startsWith("--boot-"))).toEqual([]);
  });
});

describe("app icons", () => {
  // The design's app symbol, without the metadata the design tool adds.
  const source = read("docs/design/assets/Logos/horva-app-icon.svg")
    .replace(/<metadata>.*<\/metadata>/s, "")
    .replace(' xmlns:c2pa="http://c2pa.org/manifest"', "")
    .trim();

  it.each(["apps/react/public/favicon.svg", "apps/electron/build/icon.svg"])(
    "%s is the app symbol of the design",
    (path) => {
      expect(read(path).trim()).toBe(source);
    },
  );
});
