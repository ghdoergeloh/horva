import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { expectAccessible } from "../src/axe";
import { WEB_URL } from "../src/env";

// The frame of the app: the timer on top, the dialog "Start work / Switch
// task" with the task picker, and the sidebar as an overlay on a phone.

/** Calls a procedure of the API with the session of the page. */
async function rpc<T>(
  page: Page,
  path: string,
  input: unknown,
  /** oRPC types of the input fields, e.g. `[[1, "scheduledAt"]]` for a date. */
  meta?: [number, string][],
): Promise<T> {
  const response = await page.request.post(`/api/rpc/${path}`, {
    data: meta ? { json: input, meta } : { json: input },
    headers: { Origin: WEB_URL },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { json: T }).json;
}

async function createProject(page: Page, name: string) {
  const { project } = await rpc<{ project: { id: number } }>(
    page,
    "project/create",
    { name, color: "project-3" },
  );
  return project.id;
}

async function createTask(
  page: Page,
  name: string,
  projectId: number,
  scheduledAt?: Date,
) {
  const { task } = await rpc<{ task: { id: number } }>(
    page,
    "task/create",
    { name, projectId, scheduledAt: scheduledAt?.toISOString() },
    scheduledAt ? [[1, "scheduledAt"]] : undefined,
  );
  return task.id;
}

async function openTasks(page: Page) {
  const { tasks } = await rpc<{
    tasks: {
      id: number;
      name: string;
      projectId: number;
      scheduledAt: string | null;
    }[];
  }>(page, "task/list", { status: "open" });
  return tasks;
}

async function openSlotId(page: Page) {
  const { slot } = await rpc<{ slot: { id: number } | null }>(
    page,
    "slot/status",
    {},
  );
  return slot?.id ?? null;
}

/** Answers every call of a procedure with a server error. */
async function failCalls(page: Page, path: string) {
  await page.route(`**/api/rpc/${path}`, (route) =>
    route.fulfill({ status: 500, body: "{}" }),
  );
}

function startOfToday() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * Signs a new account up and ends any work. All accounts share the data of
 * the one test database, so each test uses its own task names.
 */
async function begin(page: Page) {
  await signUp(page);
  await rpc(page, "slot/done", {});
}

function timer(page: Page) {
  return page.getByRole("region", { name: "Timer" });
}

test("starts work with a new task in a chosen project", async ({ page }) => {
  await begin(page);
  const customers = await createProject(page, "Kundenprojekte");
  await createProject(page, "Intern");
  await page.goto("/");

  await timer(page).getByRole("button", { name: "Arbeit starten" }).click();
  const dialog = page.getByRole("dialog", { name: "Arbeit starten" });
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await page.keyboard.type("Angebot schreiben");

  // The project chip in the create row opens the project step.
  await dialog.getByRole("button", { name: /^Projekt: / }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Projekt suchen …" }),
  ).toBeFocused();
  await page.keyboard.type("Kunden");
  await page.keyboard.press("Enter");
  await expect(
    dialog.getByRole("button", { name: "Projekt: Kundenprojekte, ändern" }),
  ).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(dialog).toBeHidden();
  await expect(timer(page)).toContainText("Angebot schreiben");
  await expect(timer(page)).toContainText("Kundenprojekte");

  const { tasks } = await rpc<{
    tasks: { name: string; projectId: number }[];
  }>(page, "task/list", { status: "open" });
  expect(tasks).toContainEqual(
    expect.objectContaining({
      name: "Angebot schreiben",
      projectId: customers,
    }),
  );
});

test("switches the task with the keyboard", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  const first = await createTask(page, "Rechnung schreiben", project);
  await createTask(page, "Reisekosten einreichen", project);
  await rpc(page, "slot/start", { taskId: first });
  await page.goto("/");
  await expect(timer(page)).toContainText("Rechnung schreiben");

  const switchButton = timer(page).getByRole("button", { name: "Wechseln" });
  await switchButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Aufgabe wechseln" });
  // The list is loaded before the search, so Enter picks and never creates.
  await expect(
    dialog.getByRole("option", { name: /Reisekosten einreichen/ }),
  ).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await page.keyboard.type("Reise");
  await page.keyboard.press("Enter");

  await expect(dialog).toBeHidden();
  await expect(timer(page)).toContainText("Reisekosten einreichen");
  // The dialog gives the focus back to the button that opened it.
  await expect(switchButton).toBeFocused();

  // Escape closes the dialog without a change.
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(switchButton).toBeFocused();
  await expect(timer(page)).toContainText("Reisekosten einreichen");
});

for (const scheme of ["light", "dark"] as const) {
  test(`opens the sidebar as an overlay on a phone (${scheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.emulateMedia({ colorScheme: scheme });
    await begin(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Tagesübersicht" }),
    ).toBeVisible();

    const nav = page.getByRole("complementary", { name: "Hauptnavigation" });
    await expect(nav).toBeHidden();
    const menuButton = page.getByRole("button", { name: "Menü öffnen" });
    await menuButton.click();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Heute" })).toBeFocused();

    const overflow = await page.evaluate(
      "document.documentElement.scrollWidth - document.documentElement.clientWidth",
    );
    expect(overflow, "horizontal scrolling").toBeLessThanOrEqual(0);
    await expectAccessible(page, `sidebar phone ${scheme}`);

    // Escape closes it and gives the focus back to the menu button.
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();

    // A link to the page that is open closes it too.
    await menuButton.click();
    await nav.getByRole("link", { name: "Heute" }).click();
    await expect(nav).toBeHidden();

    // A chosen page closes it too.
    await menuButton.click();
    await nav.getByRole("link", { name: "Labels" }).click();
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();
    await expect(nav).toBeHidden();
  });
}

test("creates the task only once when Enter is pressed twice", async ({
  page,
}) => {
  await begin(page);
  await createProject(page, "Intern");
  // A slow start leaves time for a second Enter.
  await page.route("**/api/rpc/slot/start", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/");

  await timer(page).getByRole("button", { name: "Arbeit starten" }).click();
  await expect(
    page.getByRole("dialog", { name: "Arbeit starten" }).getByRole("textbox"),
  ).toBeFocused();
  await page.keyboard.type("Angebot doppelt");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");

  await expect(timer(page)).toContainText("Angebot doppelt");
  await page.waitForTimeout(2000);
  const named = (await openTasks(page)).filter(
    (task) => task.name === "Angebot doppelt",
  );
  expect(named).toHaveLength(1);
});

test("a project created in the picker gets the least used color", async ({
  page,
}) => {
  await begin(page);
  await createProject(page, "Intern");
  await page.goto("/");

  await timer(page).getByRole("button", { name: "Arbeit starten" }).click();
  const dialog = page.getByRole("dialog", { name: "Arbeit starten" });
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await page.keyboard.type("Kick-off");
  await dialog.getByRole("button", { name: /^Projekt: / }).click();
  await page.keyboard.type("Nordlicht");
  await dialog.getByRole("button", { name: "Neues Projekt …" }).click();
  await expect(
    dialog.getByRole("button", { name: "Projekt: Nordlicht, ändern" }),
  ).toBeVisible();

  const { projects } = await rpc<{
    projects: { name: string; color: string }[];
  }>(page, "project/list", {});
  const created = projects.find((p) => p.name === "Nordlicht");
  const others = projects.filter((p) => p !== created);
  // The least used of project-1 … project-8, the smallest number on a tie.
  const uses = (color: string) =>
    others.filter((p) => p.color === color).length;
  const starters = Array.from({ length: 8 }, (_, i) => `project-${i + 1}`);
  const expected = starters.reduce((best, color) =>
    uses(color) < uses(best) ? color : best,
  );
  expect(created?.color).toBe(expected);
});

test("the dialog shows loading errors and tries again", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  await createTask(page, "Rechnung laden", project);
  await failCalls(page, "task/list");
  await page.goto("/");

  await timer(page).getByRole("button", { name: "Arbeit starten" }).click();
  const dialog = page.getByRole("dialog", { name: "Arbeit starten" });
  await expect(dialog.getByRole("alert")).toBeVisible();

  await page.unroute("**/api/rpc/task/list");
  await dialog.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(
    dialog.getByRole("option", { name: /Rechnung laden/ }),
  ).toBeVisible();
});

test("picking what runs already starts no new slot", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  const task = await createTask(page, "Rechnung laufend", project);
  await page.goto("/");

  // Nothing runs: no entry carries the check mark.
  await timer(page).getByRole("button", { name: "Arbeit starten" }).click();
  const start = page.getByRole("dialog", { name: "Arbeit starten" });
  await expect(start.getByRole("option", { selected: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await rpc(page, "slot/start", { taskId: task });
  await page.reload();
  const running = await openSlotId(page);
  await timer(page).getByRole("button", { name: "Wechseln" }).click();
  const dialog = page.getByRole("dialog", { name: "Aufgabe wechseln" });
  await dialog.getByRole("option", { name: /Rechnung laufend/ }).click();
  await expect(dialog).toBeHidden();
  expect(await openSlotId(page)).toBe(running);

  // The same for "no task" while a slot without a task runs.
  await rpc(page, "slot/start", {});
  await page.reload();
  const withoutTask = await openSlotId(page);
  await timer(page).getByRole("button", { name: "Wechseln" }).click();
  await dialog.getByRole("option", { name: "Ohne Aufgabe" }).click();
  await expect(dialog).toBeHidden();
  expect(await openSlotId(page)).toBe(withoutTask);
});

test("stop on a card ends the work like the timer", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  const task = await createTask(
    page,
    "Rechnung stoppen",
    project,
    startOfToday(),
  );
  await rpc(page, "slot/start", { taskId: task });
  await page.goto("/");
  await expect(timer(page)).toContainText("Rechnung stoppen");

  const card = page.getByRole("group", { name: "Rechnung stoppen" });
  await card.getByRole("button", { name: "Stoppen" }).click();
  await expect(timer(page)).toContainText("Nicht am Arbeiten");
  expect(await openSlotId(page)).toBeNull();
});

test("a failed start or stop shows a message", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  const task = await createTask(
    page,
    "Rechnung Fehler",
    project,
    startOfToday(),
  );
  await failCalls(page, "slot/start");
  await page.goto("/");

  const card = page.getByRole("group", { name: "Rechnung Fehler" });
  await card.getByRole("button", { name: "Starten" }).click();
  await expect(page.getByRole("alert")).toContainText("Starten fehlgeschlagen");

  await rpc(page, "slot/start", { taskId: task });
  await failCalls(page, "slot/done");
  await page.reload();
  await timer(page).getByRole("button", { name: "Stopp" }).click();
  await expect(page.getByRole("alert")).toContainText("Stoppen fehlgeschlagen");
  await expect(timer(page)).toContainText("Rechnung Fehler");
});

test("a card plans for today and removes the date", async ({ page }) => {
  await begin(page);
  const project = await createProject(page, "Intern");
  const yesterday = startOfToday();
  yesterday.setDate(yesterday.getDate() - 1);
  const task = await createTask(page, "Reisekosten planen", project, yesterday);
  await page.goto("/");

  const overdue = page.getByRole("region", { name: /Überfällig/ });
  const card = page.getByRole("group", { name: "Reisekosten planen" });
  await expect(
    overdue.getByRole("group", { name: "Reisekosten planen" }),
  ).toBeVisible();
  await card.hover();
  await card.getByRole("button", { name: "Heute", exact: true }).click();
  await expect(overdue).toBeHidden();
  // The browser plans for midnight in its own time zone.
  const berlinDay = (date: Date) =>
    date.toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const planned = (await openTasks(page)).find((t) => t.id === task);
  expect(berlinDay(new Date(planned?.scheduledAt ?? 0))).toBe(
    `${new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}, 00:00:00`,
  );

  await card.getByRole("button", { name: /^Datum: / }).click();
  await page.getByRole("button", { name: "Datum entfernen" }).click();
  await expect(card).toBeHidden();
  const unplanned = (await openTasks(page)).find((t) => t.id === task);
  expect(unplanned?.scheduledAt).toBeNull();
});

test("an activity is done for today with its repeat button", async ({
  page,
}) => {
  await begin(page);
  const projectId = await createProject(page, "Aktivitäten");
  const scheduledAt = startOfToday();
  scheduledAt.setHours(0, 5);
  const { task } = await rpc<{ task: { id: number } }>(
    page,
    "task/create",
    {
      name: "Posteingang leeren",
      projectId,
      taskType: "activity",
      scheduledAt: scheduledAt.toISOString(),
      recurrenceRule: "FREQ=DAILY",
    },
    [[1, "scheduledAt"]],
  );
  await page.goto("/");
  const card = page.getByRole("group", { name: /Posteingang leeren/ });
  await card.getByRole("button", { name: "Für heute erledigt" }).click();
  await expect(card).toHaveCount(0);
  const { task: after } = await rpc<{ task: { scheduledAt: string } }>(
    page,
    "task/get",
    { id: task.id },
  );
  expect(new Date(after.scheduledAt).getTime()).toBeGreaterThan(Date.now());
});

test("a task moves from later today to due now while the page is open", async ({
  page,
}) => {
  await begin(page);
  const projectId = await createProject(page, "Uhrzeit");
  const start = new Date();
  start.setHours(10, 0, 0, 0);
  await createTask(page, "Telefonat um zehn", projectId, start);

  const before = new Date(start.getTime() - 5 * 60_000);
  await page.clock.install({ time: before });
  await page.goto("/");
  const later = page.locator("section", {
    has: page.getByRole("heading", { name: /Später heute/ }),
  });
  const due = page.locator("section", {
    has: page.getByRole("heading", { name: /Jetzt fällig/ }),
  });
  await expect(later.getByText("Telefonat um zehn")).toBeVisible();

  // Half an hour later the page shows it as due, without a reload.
  await page.clock.runFor(30 * 60_000);
  await expect(due.getByText("Telefonat um zehn")).toBeVisible();
});
