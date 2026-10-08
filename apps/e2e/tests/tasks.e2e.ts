import { expect, test } from "@playwright/test";

import { rpc, signUp } from "../src/api";

interface Row {
  id: number;
}

/** Projects of the current test; deleted after it with their tasks. */
const projects: number[] = [];
const tasks: number[] = [];

test.afterEach(async ({ page }) => {
  for (const id of tasks.splice(0)) await rpc(page, "task/delete", { id });
  for (const id of projects.splice(0))
    await rpc(page, "project/delete", { id });
});

async function projectWithTask(page: Parameters<typeof rpc>[0]) {
  const { project } = await rpc<{ project: Row }>(page, "project/create", {
    name: "Planung",
  });
  projects.push(project.id);
  const { task } = await rpc<{ task: Row }>(page, "task/create", {
    projectId: project.id,
    name: "Bericht schreiben",
  });
  tasks.push(task.id);
  return project.id;
}

test("the task drawer saves a typed date once, when the field loses focus", async ({
  page,
}) => {
  await signUp(page);
  const projectId = await projectWithTask(page);
  let plans = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/rpc/task/plan")) plans += 1;
  });

  await page.goto(`/tasks/${String(projectId)}`);
  const card = page.getByRole("group", { name: "Bericht schreiben" });
  await card.focus();
  await card.getByRole("button", { name: "Weitere Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Details öffnen" }).click();
  const drawer = page.getByRole("dialog", { name: "Aufgaben-Eigenschaften" });

  // Day, month, year, hour and minute; each segment moves on by itself.
  await drawer.getByRole("spinbutton").first().click();
  await page.keyboard.type("030620301000");
  await drawer.getByLabel("Notizen").click();
  await expect.poll(() => plans).toBe(1);

  // A new year, typed digit by digit, is one more save.
  await drawer.getByRole("spinbutton").nth(2).click();
  await page.keyboard.type("2031");
  await drawer.getByLabel("Notizen").click();
  await expect.poll(() => plans).toBe(2);
  const { task } = await rpc<{ task: { scheduledAt: string } }>(
    page,
    "task/get",
    { id: tasks[0] },
  );
  expect(new Date(task.scheduledAt).getFullYear()).toBe(2031);
});

test("closing the new task form returns the focus to its button", async ({
  page,
}) => {
  await signUp(page);
  const projectId = await projectWithTask(page);
  await page.goto(`/tasks/${String(projectId)}`);

  for (const label of ["Neue Aufgabe", "Neue Aktivität"]) {
    const open = page.getByRole("button", { name: label });
    await open.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: label })).toBeFocused();

    await page.getByRole("button", { name: label }).click();
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await expect(page.getByRole("button", { name: label })).toBeFocused();
  }
});

test("an unknown project shows that it was not found", async ({ page }) => {
  await signUp(page);
  await page.goto("/tasks/999999");
  await expect(
    page.getByRole("heading", { name: "Projekt nicht gefunden" }),
  ).toBeVisible();
});
