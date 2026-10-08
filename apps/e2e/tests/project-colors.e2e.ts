import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { rpc, signUp } from "../src/api";

interface Project {
  id: number;
  name: string;
  color: string;
}

/** Projects of the current test; deleted after it, so other screens stay the same. */
const created: number[] = [];

test.afterEach(async ({ page }) => {
  for (const id of created.splice(0)) await rpc(page, "project/delete", { id });
});

async function create(page: Page, input: { name: string; color?: string }) {
  const { project: row } = await rpc<{ project: Project }>(
    page,
    "project/create",
    input,
  );
  created.push(row.id);
  return row;
}

async function project(page: Page, id: number) {
  return (await rpc<{ project: Project }>(page, "project/get", { id })).project;
}

test("a new project gets one of the first eight colors", async ({ page }) => {
  await signUp(page);
  const row = await create(page, { name: "Website" });
  expect(row.color).toMatch(/^project-[1-8]$/);
});

test("a project created with a color shows it on its page", async ({
  page,
}) => {
  await signUp(page);
  const row = await create(page, { name: "Nordlicht", color: "project-5" });
  await page.goto(`/tasks/${String(row.id)}`);
  const heading = page.getByRole("heading", { level: 1, name: "Nordlicht" });
  await expect(heading).toBeVisible();
  // The dot before the title takes the CSS variable of the token.
  await expect(
    page.locator("header span[aria-hidden]").first(),
  ).toHaveAttribute("style", /var\(--project-5\)/);
});

test("the project drawer changes the color to a preset and to a custom hex", async ({
  page,
}) => {
  await signUp(page);
  const row = await create(page, { name: "Farbtest" });
  await page.goto(`/tasks/${String(row.id)}`);
  const edit = page.getByRole("button", { name: "Projekt bearbeiten" });
  await edit.click();
  const drawer = page.getByRole("dialog", { name: "Projekt-Eigenschaften" });

  await drawer.getByRole("radio", { name: "Petrol" }).click();
  await expect(drawer.getByRole("radio", { name: "Petrol" })).toBeChecked();
  await expect
    .poll(async () => (await project(page, row.id)).color)
    .toBe("project-3");

  const custom = drawer.getByLabel("Eigene Farbe");
  await custom.fill("#12ab34");
  await custom.press("Enter");
  await expect
    .poll(async () => (await project(page, row.id)).color)
    .toBe("#12AB34");

  // Escape closes the drawer and gives the focus back.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(edit).toBeFocused();
});
