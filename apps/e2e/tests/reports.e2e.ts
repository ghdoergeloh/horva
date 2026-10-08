import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { WEB_URL } from "../src/env";

/** The time of the browser: Wednesday, 3 June 2026. */
const NOW = new Date("2026-06-03T10:00:00+02:00");

/**
 * Calls a procedure over the oRPC protocol of the app. Date fields are
 * listed in `dates`, so the server reads them as dates.
 */
async function rpc<T>(
  page: Page,
  path: string,
  input: Record<string, unknown>,
  dates: string[] = [],
): Promise<T> {
  const response = await page.request.post(`/api/rpc/${path}`, {
    data: { json: input, meta: dates.map((key) => [1, key]) },
    headers: { Origin: WEB_URL },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { json: T }).json;
}

async function createTask(
  page: Page,
  name: string,
  projectId: number,
  labelIds: number[] = [],
) {
  const { task } = await rpc<{ task: { id: number } }>(page, "task/create", {
    name,
    projectId,
    labelIds,
  });
  return task.id;
}

/** Starts a slot at a local time in Berlin; without a task it has none. */
async function startAt(page: Page, at: string, taskId?: number) {
  await rpc(
    page,
    "slot/start",
    { at: `${at}:00+02:00`, ...(taskId ? { taskId } : {}) },
    ["at"],
  );
}

async function closeAt(page: Page, at: string) {
  await rpc(page, "slot/done", { at: `${at}:00+02:00` }, ["at"]);
}

/** What `logWeek` created, to remove it again. */
interface Logged {
  labelId: number;
  projectIds: number[];
  taskIds: number[];
}

/**
 * Two days of work in the week of 1 June 2026:
 * Kranich 5:15 (Review with the label "Kunde"), Intern 1:30, 0:30 without
 * a task.
 */
async function logWeek(page: Page): Promise<Logged> {
  const { label } = await rpc<{ label: { id: number } }>(page, "label/create", {
    name: "Kunde",
  });
  const project = async (name: string, color: string) =>
    (
      await rpc<{ project: { id: number } }>(page, "project/create", {
        name,
        color,
      })
    ).project.id;
  const kranich = await project("Kranich", "project-7");
  const intern = await project("Intern", "project-1");
  const review = await createTask(page, "Review", kranich, [label.id]);
  const planning = await createTask(page, "Planung", intern);

  await startAt(page, "2026-06-01T08:00", review);
  await startAt(page, "2026-06-01T10:00", planning);
  await startAt(page, "2026-06-01T11:30");
  await closeAt(page, "2026-06-01T12:00");
  await startAt(page, "2026-06-02T09:00", review);
  await closeAt(page, "2026-06-02T12:15");
  return {
    labelId: label.id,
    projectIds: [kranich, intern],
    taskIds: [review, planning],
  };
}

/**
 * Removes the logged week. All accounts share one database, and the
 * screens test after this one must not show these projects or times.
 */
async function removeWeek(page: Page, logged: Logged) {
  const { slots } = await rpc<{ slots: { id: number }[] }>(
    page,
    "slot/list",
    { from: "2026-06-01T00:00:00+02:00", to: "2026-06-03T00:00:00+02:00" },
    ["from", "to"],
  );
  for (const { id } of slots) await rpc(page, "slot/delete", { id });
  for (const id of logged.taskIds) await rpc(page, "task/delete", { id });
  for (const id of logged.projectIds) await rpc(page, "project/delete", { id });
  await rpc(page, "label/delete", { id: logged.labelId });
}

test("the report shows the time of the chosen period", async ({ page }) => {
  await signUp(page);
  const logged = await logWeek(page);
  try {
    await checkReport(page);
  } finally {
    await removeWeek(page, logged);
  }
});

async function checkReport(page: Page) {
  await page.clock.setFixedTime(NOW);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Auswertung" })).toBeVisible();

  // Today has no time yet.
  const tiles = page.locator("dl").first();
  await expect(tiles.getByText("0m").first()).toBeVisible();

  await page.getByRole("button", { name: "Kalender öffnen" }).click();
  await page.getByRole("button", { name: "Diese Woche" }).click();

  // Total 7:15, on 2 days, Kranich largest.
  await expect(tiles.getByText("7h 15m")).toBeVisible();
  await expect(tiles.getByText("2 Tage erfasst")).toBeVisible();
  await expect(tiles.getByText("Kranich")).toBeVisible();
  // The tile rounds like the ring: 72 % of the time, as in the legend.
  await expect(tiles.getByText("72\u202F% · 5h 15m")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Kranich: 5h 15m , 72\u202F%" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stunden je Tag" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /^Kranich: 5h 15m/ }),
  ).toBeVisible();

  // A project row opens with Enter and shows its tasks.
  const details = page.getByRole("region", { name: "Details je Projekt" });
  const head = details.getByRole("button", { name: /Kranich/ });
  await head.focus();
  await page.keyboard.press("Enter");
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await expect(details.getByText("Review")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(details.getByRole("button", { name: /Intern/ })).toBeFocused();

  // The label filter lists the tasks with the label.
  await page.getByRole("button", { name: /Nach Label filtern/ }).click();
  await page.getByRole("option", { name: "Kunde" }).click();
  const labelled = page.getByRole("region", {
    name: "Aufgaben mit Label „Kunde“",
  });
  await expect(labelled.getByRole("button", { name: /Kranich/ })).toBeVisible();
  await expect(labelled.getByRole("button", { name: /Intern/ })).toHaveCount(0);

  // With data, the narrowest phone still needs no horizontal scrolling.
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.setViewportSize({ width: 400, height: 800 });
  await expect(page.getByRole("heading", { name: "Auswertung" })).toBeVisible();
  const overflow = await page.evaluate(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
  expect(overflow, "horizontal scrolling").toBeLessThanOrEqual(0);
}

test("the report offers a retry when it cannot load", async ({ page }) => {
  await signUp(page);
  await page.route("**/api/rpc/log/summary", (route) => route.abort());
  await page.goto("/reports");
  const alert = page.getByRole("alert");
  // The query retries a few times before it gives up.
  await expect(alert).toContainText("Auswertung konnte nicht geladen werden.", {
    timeout: 20_000,
  });
  await expect(page.getByText("Keine Zeiten in diesem Zeitraum")).toHaveCount(
    0,
  );

  await page.unroute("**/api/rpc/log/summary");
  await alert.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(
    page.getByRole("heading", { name: "Projektanteile" }),
  ).toBeVisible();
  await expect(alert).toHaveCount(0);
});

/** Answers an oRPC call with `output`. */
async function fake(page: Page, path: string, output: unknown) {
  await page.route(`**/api/rpc/${path}`, (route) =>
    route.fulfill({ json: { json: output } }),
  );
}

/** Two rows Moco can take: Review on 1 and 2 June, in Kranich. */
const previewLines = ["2026-06-01", "2026-06-02"].map((date) => ({
  date,
  projectId: 7,
  projectName: "Kranich",
  taskId: 70,
  taskName: "Review",
  seconds: 7200,
  status: "syncable",
  mocoProjectId: 900,
  mocoTaskId: 901,
}));

test("the Moco dialog sends the chosen rows", async ({ page }) => {
  await signUp(page);
  await fake(page, "moco/config/get", {
    configured: true,
    subdomain: "example",
  });
  await fake(page, "moco/preview", { lines: previewLines });
  await fake(page, "moco/remoteProjects", {
    projects: [
      {
        id: 900,
        name: "Kranich GmbH",
        tasks: [{ id: 901, name: "Entwicklung", active: true, billable: true }],
      },
    ],
  });
  const sent: unknown[] = [];
  await page.route("**/api/rpc/moco/sync", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { json: { created: 1, failed: [] } } });
  });
  await page.goto("/reports");

  const transfer = page.getByRole("button", { name: "An Moco übertragen" });
  const dialog = page.getByRole("dialog", { name: "An Moco übertragen" });

  // Opened with the keyboard, closed with Escape: focus goes back.
  await transfer.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Kranich GmbH")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(transfer).toBeFocused();

  // Closed with the close button: focus goes back too.
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(transfer).toBeFocused();

  // One row chosen and sent.
  await page.keyboard.press("Enter");
  await dialog
    .getByRole("checkbox", { name: "2026-06-02 Review" })
    .click({ force: true });
  await dialog.getByRole("button", { name: "1 Eintrag übertragen" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "1 übertragen, 0 fehlgeschlagen",
  );
  expect(sent).toHaveLength(1);
  expect(JSON.stringify(sent[0])).toContain(
    '"select":[{"date":"2026-06-02","taskId":70}]',
  );
});
