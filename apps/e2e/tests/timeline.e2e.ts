import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { WEB_URL } from "../src/env";

// The browser app starts in German. All data in this database is shared,
// so each test works in its own week and clears it first.

/** Encodes an oRPC input: dates go into `meta` as type 1. */
function rpcBody(input: Record<string, unknown>) {
  const meta: (string | number)[][] = [];
  const json: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Date) {
      meta.push([1, key]);
      json[key] = value.toISOString();
    } else json[key] = value;
  }
  return { json, meta };
}

/** Calls a procedure of the API with the session of the page. */
async function rpc<T>(
  page: Page,
  path: string,
  input: Record<string, unknown> = {},
): Promise<T> {
  const response = await page.request.post(`/api/rpc/${path}`, {
    data: rpcBody(input),
    headers: { Origin: WEB_URL },
  });
  const body = (await response.json()) as { json: T };
  expect(response.ok(), JSON.stringify(body)).toBe(true);
  return body.json;
}

/** A time on a day in Berlin time, such as `at("2026-02-04", "09:20")`. */
function at(day: string, clock: string): Date {
  return new Date(`${day}T${clock}:00+01:00`);
}

/** Deletes all slots of the week of `day`, a Wednesday. */
async function clearWeek(page: Page, day: string) {
  // Each test day is a Wednesday: its week runs from two days before to
  // five days after it.
  const from = at(day, "00:00");
  from.setDate(from.getDate() - 2);
  const to = at(day, "00:00");
  to.setDate(to.getDate() + 5);
  const { slots } = await rpc<{ slots: { id: number }[] }>(page, "slot/list", {
    from,
    to,
  });
  for (const slot of slots) await rpc(page, "slot/delete", { id: slot.id });
}

/** Creates a project with a task; the names carry a suffix per run. */
async function projectWithTask(page: Page, project: string, task: string) {
  const suffix = Math.random().toString(36).slice(2, 6);
  const created = await rpc<{ project: { id: number; name: string } }>(
    page,
    "project/create",
    { name: `${project} ${suffix}` },
  );
  const { task: made } = await rpc<{ task: { id: number; name: string } }>(
    page,
    "task/create",
    { name: `${task} ${suffix}`, projectId: created.project.id },
  );
  return { project: created.project, task: made };
}

async function addSlot(
  page: Page,
  start: Date,
  end: Date | null,
  taskId: number | null = null,
) {
  const { inserted } = await rpc<{ inserted: { id: number } }>(
    page,
    "slot/insert",
    end
      ? { startedAt: start, endedAt: end, taskId }
      : { startedAt: start, taskId },
  );
  return inserted.id;
}

/** Opens the timeline with the browser clock at `now`. */
async function openTimeline(page: Page, now: Date) {
  await page.clock.setFixedTime(now);
  await page.goto("/timeline");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
}

/** The row of the slot table or work period list that starts with the times. */
function row(page: Page, text: RegExp) {
  return page.getByRole("row", { name: text });
}

/** The left and right edge of an element. */
async function edges(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} is not visible`);
  return { left: box.x, right: box.x + box.width };
}

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test("the running slot stays in the day track after the last end (#75)", async ({
  page,
}) => {
  const day = "2026-02-04";
  await clearWeek(page, day);
  const { task } = await projectWithTask(page, "Nordlicht", "Adapter");
  await addSlot(page, at(day, "09:00"), at(day, "10:00"), task.id);
  await addSlot(page, at(day, "10:00"), at(day, "11:00"), task.id);
  const running = await addSlot(page, at(day, "13:00"), null, task.id);
  try {
    await openTimeline(page, at(day, "15:30"));
    await expect(page.locator("[data-running]")).toBeVisible();
    // The scale grows with the running slot, up to 16:00.
    await expect(page.getByText("16:00", { exact: true })).toBeVisible();
    await expect(page.getByText("17:00", { exact: true })).toHaveCount(0);
    const bar = await edges(page, "[data-running]");
    const track = await edges(page, "[data-running] >> xpath=..");
    expect(bar.right).toBeLessThanOrEqual(track.right + 0.5);
    expect(bar.left).toBeGreaterThan(track.left);
  } finally {
    await rpc(page, "slot/delete", { id: running });
  }
});

test("a running slot alone in the week has a valid scale (#75)", async ({
  page,
}) => {
  const day = "2026-02-11";
  await clearWeek(page, day);
  const running = await addSlot(page, at(day, "09:20"), null);
  try {
    await openTimeline(page, at(day, "11:00"));
    await expect(
      page.getByText("09:00", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("11:00", { exact: true }).first(),
    ).toBeVisible();
    const bar = await edges(page, "[data-running]");
    const track = await edges(page, "[data-running] >> xpath=..");
    expect(bar.right).toBeLessThanOrEqual(track.right + 0.5);
    expect(bar.left).toBeGreaterThan(track.left);
  } finally {
    await rpc(page, "slot/delete", { id: running });
  }
});

test("work periods merge contiguous slots and copy the day (#76)", async ({
  page,
  context,
}) => {
  const day = "2026-02-18";
  await clearWeek(page, day);
  const a = await projectWithTask(page, "Nordlicht", "Mail");
  const b = await projectWithTask(page, "Kranich", "Adapter");
  await addSlot(page, at(day, "09:20"), at(day, "09:27"), a.task.id);
  await addSlot(page, at(day, "09:27"), at(day, "10:16"), b.task.id);
  await addSlot(page, at(day, "10:45"), at(day, "12:30"), a.task.id);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await openTimeline(page, at(day, "14:00"));
  await page.getByRole("radio", { name: "Arbeitszeiten" }).click();

  await expect(row(page, /^09:20 10:16 0:56 2 Slots/)).toBeVisible();
  await expect(row(page, /^10:16 10:45 0:29 Pause/)).toBeVisible();
  await expect(row(page, /^10:45 12:30 1:45 1 Slot/)).toBeVisible();
  await expect(row(page, /^Arbeitszeit 2:41/)).toBeVisible();

  await page.getByRole("button", { name: "Tag kopieren" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Kopiert" }),
  ).toHaveCount(1);
  expect(await page.evaluate("navigator.clipboard.readText()")).toBe(
    "09:20–10:16, 10:45–12:30",
  );

  // Without the clipboard, the list says that copying failed.
  await page.evaluate(
    "navigator.clipboard.writeText = () => Promise.reject(new Error('denied'))",
  );
  await page
    .getByRole("button", { name: "Zeitraum 09:20–10:16 kopieren" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Kopieren fehlgeschlagen",
  );
});

test("a slot is edited with the keyboard; Enter saves and opens nothing (#34)", async ({
  page,
}) => {
  const day = "2026-02-25";
  await clearWeek(page, day);
  const a = await projectWithTask(page, "Nordlicht", "Mail");
  const b = await projectWithTask(page, "Kranich", "Adapter");
  await addSlot(page, at(day, "09:00"), at(day, "10:00"), a.task.id);
  await addSlot(page, at(day, "10:00"), at(day, "11:00"), b.task.id);
  await openTimeline(page, at(day, "18:00"));

  await page
    .getByRole("button", { name: "Slot 09:00–10:00 bearbeiten" })
    .focus();
  await page.keyboard.press("Enter");
  const editRow = page.locator("tr[data-editing]");
  await expect(editRow).toBeVisible();
  // The start has the focus; Tab moves on to the end.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1030");
  // The row says which neighbour moves before saving.
  await expect(editRow).toContainText(
    `Der Slot danach (${b.task.name}) beginnt dann um 10:30.`,
  );

  // Enter on the closed task field saves the row and opens no list.
  await editRow.locator("[data-task-field] button").focus();
  await page.keyboard.press("Enter");
  await expect(editRow).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row(page, /^09:00 10:30 1:30/)).toBeVisible();
  await expect(row(page, /^10:30 11:00 0:30/)).toBeVisible();
  // The focus returns to the edit button of the slot.
  await expect(
    page.getByRole("button", { name: "Slot 09:00–10:30 bearbeiten" }),
  ).toBeFocused();
});

test("a click outside saves a valid draft and keeps an invalid one (#34)", async ({
  page,
}) => {
  const day = "2026-03-04";
  await clearWeek(page, day);
  await addSlot(page, at(day, "09:00"), at(day, "10:00"));
  await openTimeline(page, at(day, "18:00"));
  const editRow = page.locator("tr[data-editing]");
  const outside = page.getByRole("heading", { level: 2 });

  await page
    .getByRole("button", { name: "Slot 09:00–10:00 bearbeiten" })
    .click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.type("0945");
  await outside.click();
  await expect(editRow).toHaveCount(0);
  await expect(row(page, /^09:00 09:45 0:45/)).toBeVisible();

  await page
    .getByRole("button", { name: "Slot 09:00–09:45 bearbeiten" })
    .click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.type("0900");
  await outside.click();
  await expect(editRow).toBeVisible();
  await expect(editRow.getByRole("alert")).toHaveText(
    "Das Ende muss nach dem Start liegen.",
  );

  // Cancel discards the draft.
  await editRow.getByRole("button", { name: "Abbrechen" }).click();
  await expect(editRow).toHaveCount(0);
  await expect(row(page, /^09:00 09:45 0:45/)).toBeVisible();
});

test("a new slot fills a gap", async ({ page }) => {
  const day = "2026-03-11";
  await clearWeek(page, day);
  await addSlot(page, at(day, "09:00"), at(day, "10:00"));
  await addSlot(page, at(day, "11:00"), at(day, "12:00"));
  await openTimeline(page, at(day, "18:00"));

  await expect(row(page, /^10:00 11:00 1:00 Lücke/)).toBeVisible();
  await page
    .getByRole("button", { name: "Slot von 10:00 bis 11:00 eintragen" })
    .click();
  await expect(page.locator("tr[data-editing]")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.locator("tr[data-editing]")).toHaveCount(0);
  await expect(row(page, /^10:00 11:00 1:00 Ohne Aufgabe/)).toBeVisible();
  await expect(row(page, /Lücke/)).toHaveCount(0);
});

test("the task picker creates a task in a chosen project (#33)", async ({
  page,
}) => {
  const day = "2026-03-18";
  await clearWeek(page, day);
  const a = await projectWithTask(page, "Nordlicht", "Mail");
  const b = await projectWithTask(page, "Kranich", "Adapter");
  await addSlot(page, at(day, "09:00"), at(day, "10:00"), a.task.id);
  await openTimeline(page, at(day, "18:00"));
  const taskName = `Angebot ${Math.random().toString(36).slice(2, 6)}`;

  await page
    .getByRole("button", { name: "Slot 09:00–10:00 bearbeiten" })
    .click();
  const editRow = page.locator("tr[data-editing]");
  await editRow.locator("[data-task-field] button").click();
  const search = page.getByRole("textbox", {
    name: "Aufgabe suchen oder neu anlegen …",
  });
  await expect(search).toBeFocused();
  await page.keyboard.type(taskName);
  // Tab goes to the project of the new task.
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Projekt suchen …" }),
  ).toBeFocused();
  await page.keyboard.type(b.project.name);
  await page.keyboard.press("Enter");
  await expect(search).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(search).toHaveCount(0);
  await expect(editRow.locator("[data-task-field] button")).toContainText(
    taskName,
  );
  await editRow.getByRole("button", { name: /Speichern/ }).click();
  await expect(editRow).toHaveCount(0);
  await expect(
    row(page, new RegExp(`^09:00 10:00 1:00 ${taskName}`)),
  ).toContainText(b.project.name);

  const { tasks } = await rpc<{
    tasks: { name: string; projectId: number }[];
  }>(page, "task/list", { status: "open" });
  expect(tasks.find((t) => t.name === taskName)?.projectId).toBe(b.project.id);
});

test("a slot is deleted after a question", async ({ page }) => {
  const day = "2026-03-25";
  await clearWeek(page, day);
  await addSlot(page, at(day, "09:00"), at(day, "10:00"));
  await addSlot(page, at(day, "10:00"), at(day, "11:00"));
  await openTimeline(page, at(day, "18:00"));

  await page
    .getByRole("button", { name: "Slot 10:00–11:00 bearbeiten" })
    .click();
  await page.getByRole("button", { name: "Slot löschen" }).click();
  const question = page.getByRole("alertdialog", { name: "Slot löschen?" });
  await expect(question).toContainText("10:00–11:00");
  await question.getByRole("button", { name: "Löschen" }).click();

  await expect(question).toHaveCount(0);
  await expect(row(page, /^10:00 11:00/)).toHaveCount(0);
  await expect(row(page, /^09:00 10:00 1:00/)).toBeVisible();
});

test("a failed delete says so and reloads the day", async ({ page }) => {
  const day = "2026-01-07";
  await clearWeek(page, day);
  await addSlot(page, at(day, "09:00"), at(day, "10:00"));
  const gone = await addSlot(page, at(day, "10:00"), at(day, "11:00"));
  await openTimeline(page, at(day, "18:00"));

  await page
    .getByRole("button", { name: "Slot 10:00–11:00 bearbeiten" })
    .click();
  await page.getByRole("button", { name: "Slot löschen" }).click();
  const question = page.getByRole("alertdialog", { name: "Slot löschen?" });
  await expect(question).toBeVisible();
  // Someone else deletes the slot while the question is open.
  await rpc(page, "slot/delete", { id: gone });
  await question.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Löschen fehlgeschlagen. Erneut versuchen?",
  );
  await expect(row(page, /^10:00 11:00/)).toHaveCount(0);
  await expect(row(page, /^09:00 10:00 1:00/)).toBeVisible();
});

test("a slot from Sunday night shows on Monday, also while it runs", async ({
  page,
}) => {
  await clearWeek(page, "2026-01-14");
  await clearWeek(page, "2026-01-21");
  const night = await addSlot(
    page,
    at("2026-01-18", "22:00"),
    at("2026-01-19", "02:00"),
  );
  await openTimeline(page, at("2026-01-19", "10:00"));
  await expect(
    page.getByRole("button", { name: /00:00 bis 02:00/ }),
  ).toBeVisible();

  await rpc(page, "slot/delete", { id: night });
  const running = await addSlot(page, at("2026-01-18", "22:00"), null);
  try {
    await openTimeline(page, at("2026-01-19", "10:00"));
    await expect(
      page.getByRole("button", { name: /00:00 bis jetzt/ }),
    ).toBeVisible();
    // The running slot covers the whole day so far: no slot to add.
    await expect(
      page.getByRole("button", { name: "Slot eintragen", exact: true }),
    ).toHaveCount(0);
  } finally {
    await rpc(page, "slot/delete", { id: running });
  }
});

test("the project filter hides gaps, rests in work periods and resets", async ({
  page,
}) => {
  await clearWeek(page, "2026-01-21");
  await clearWeek(page, "2026-01-28");
  const day = "2026-01-28";
  const a = await projectWithTask(page, "Nordlicht", "Mail");
  const b = await projectWithTask(page, "Kranich", "Adapter");
  await addSlot(page, at(day, "09:00"), at(day, "10:00"), a.task.id);
  await addSlot(page, at(day, "10:30"), at(day, "11:00"), b.task.id);
  await addSlot(
    page,
    at("2026-01-21", "09:00"),
    at("2026-01-21", "10:00"),
    b.task.id,
  );
  await openTimeline(page, at(day, "18:00"));
  await expect(row(page, /Lücke/)).toBeVisible();

  const filter = page.getByRole("button", { name: /Projekt filtern/ });
  await filter.click();
  await page.getByRole("option", { name: a.project.name }).click();
  await expect(row(page, /^09:00 10:00 1:00/)).toBeVisible();
  await expect(row(page, /^10:30 11:00/)).toHaveCount(0);
  await expect(row(page, /Lücke/)).toHaveCount(0);

  // Work periods count all projects; the filter rests.
  await page.getByRole("radio", { name: "Arbeitszeiten" }).click();
  await expect(filter).toBeDisabled();
  await page.getByRole("radio", { name: "Slots" }).click();
  await expect(filter).toBeEnabled();

  // A week without the project shows all projects.
  await page.getByRole("button", { name: "Vorherige Woche" }).click();
  await expect(filter).toContainText("Alle Projekte");
  await expect(
    page.getByRole("button", { name: new RegExp(b.task.name) }),
  ).toBeVisible();
});
