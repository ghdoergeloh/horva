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
}
