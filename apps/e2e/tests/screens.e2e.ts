import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { expectAccessible } from "../src/axe";

/**
 * Every screen in light and dark, on a desktop and a phone: nothing may be
 * wider than the screen, and axe checks the page as rendered. The
 * combinations in `screenshots` are also compared with the reference in
 * `tests/__screenshots__`, as a smoke test of the layout. After an
 * intended change, update the references with
 * `pnpm test:e2e --update-snapshots` and look at every new image.
 *
 * The references come from Chromium on Linux arm64 (the CI runner, the dev
 * container on Apple silicon). Other systems render a little differently
 * and skip the comparison.
 */
const comparesScreenshots =
  process.platform === "linux" && process.arch === "arm64";
const screens: {
  name: string;
  path: string;
  signedIn: boolean;
  heading: string | RegExp;
}[] = [
  // Signed out, every path shows the login of the gate.
  { name: "login", path: "/", signedIn: false, heading: "Anmelden" },
  { name: "today", path: "/", signedIn: true, heading: "Tagesübersicht" },
  { name: "tasks", path: "/tasks", signedIn: true, heading: "Alle Aufgaben" },
  // The default project, which the API creates on its first start.
  { name: "project", path: "/tasks/1", signedIn: true, heading: "Default" },
  // The heading is the week, e.g. "KW 23 · 1.–7. Jun. 2026".
  { name: "timeline", path: "/timeline", signedIn: true, heading: /\d/ },
  { name: "reports", path: "/reports", signedIn: true, heading: "Auswertung" },
  { name: "labels", path: "/labels", signedIn: true, heading: "Labels" },
  {
    name: "settings",
    path: "/settings",
    signedIn: true,
    heading: "Einstellungen",
  },
];

/** The time of the browser: the screens show dates, the images must not. */
const NOW = new Date("2026-06-03T10:00:00+02:00");

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  // The narrowest phone the app supports.
  { name: "phone", width: 400, height: 800 },
] as const;

const schemes = ["light", "dark"] as const;

/**
 * The combinations with a screenshot, as `screen-viewport-scheme`: each
 * viewport and each scheme once. More images make every visual change
 * expensive to review.
 */
const screenshots = new Set([
  "login-desktop-light",
  "today-desktop-dark",
  "today-phone-light",
]);

async function open(page: Page, path: string, heading: string | RegExp) {
  await page.clock.setFixedTime(NOW);
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  // Values that come from the API must be there before the screenshot.
  await expect(page.getByText("…")).toHaveCount(0);
  await page.evaluate("document.fonts.ready");
}

for (const screen of screens) {
  for (const viewport of viewports) {
    for (const scheme of schemes) {
      test(`${screen.name} (${viewport.name}, ${scheme})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme });
        // The same account on every run keeps the screenshots comparable;
        // the database is new on every run.
        if (screen.signedIn)
          await signUp(page, {
            name: "Robin Example",
            email: `robin-${screen.name}-${viewport.name}-${scheme}@example.test`,
            password: "a-long-test-password",
          });
        await open(page, screen.path, screen.heading);

        // Nothing may be wider than the screen, e.g. a table or a sidebar.
        const overflow = await page.evaluate(
          "document.documentElement.scrollWidth - document.documentElement.clientWidth",
        );
        expect(overflow, "horizontal scrolling").toBeLessThanOrEqual(0);

        await expectAccessible(
          page,
          `${screen.name} ${viewport.name} ${scheme}`,
        );

        const id = `${screen.name}-${viewport.name}-${scheme}`;
        if (comparesScreenshots && screenshots.has(id))
          await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true });
      });
    }
  }
}
