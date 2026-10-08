import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { expectAccessible } from "../src/axe";
import { WEB_URL } from "../src/env";

// The frame of the app: the timer on top, the dialog "Start work / Switch
// task" with the task picker, and the sidebar as an overlay on a phone.

/** Calls a procedure of the API with the session of the page. */
async function rpc<T>(page: Page, path: string, input: unknown): Promise<T> {
  const response = await page.request.post(`/api/rpc/${path}`, {
    data: { json: input },
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

async function createTask(page: Page, name: string, projectId: number) {
  const { task } = await rpc<{ task: { id: number } }>(page, "task/create", {
    name,
    projectId,
  });
  return task.id;
}

function timer(page: Page) {
  return page.getByRole("region", { name: "Timer" });
}

test("starts work with a new task in a chosen project", async ({ page }) => {
  await signUp(page);
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
  await signUp(page);
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
    await signUp(page);
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

    // A chosen page closes it too.
    await menuButton.click();
    await nav.getByRole("link", { name: "Labels" }).click();
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();
    await expect(nav).toBeHidden();
  });
}
