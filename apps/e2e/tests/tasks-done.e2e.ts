import { expect, test } from "@playwright/test";

import { rpc, signUp } from "../src/api";

/** Projects of the current test; deleted after it, so other screens stay the same. */
const created: number[] = [];

test.afterEach(async ({ page }) => {
  for (const id of created.splice(0)) await rpc(page, "project/delete", { id });
});

test("the task ticked off last is on top of the done list", async ({
  page,
}) => {
  await signUp(page);
  const { project } = await rpc<{ project: { id: number } }>(
    page,
    "project/create",
    { name: "Erledigt-Test" },
  );
  created.push(project.id);
  for (const name of ["Erste erledigt", "Zweite erledigt", "Noch offen"]) {
    await rpc(page, "task/create", { name, projectId: project.id });
  }
  const { tasks } = await rpc<{ tasks: { id: number; name: string }[] }>(
    page,
    "task/list",
    { projectId: project.id },
  );
  const id = (name: string) => tasks.find((t) => t.name === name)?.id;
  await rpc(page, "task/done", { id: id("Erste erledigt") });
  await rpc(page, "task/done", { id: id("Zweite erledigt") });

  await page.goto(`/tasks/${String(project.id)}`);
  await page.getByRole("button", { name: /Erledigte Aufgaben/ }).click();
  const doneList = page.locator("section", {
    has: page.getByRole("heading", { name: /Erledigte Aufgaben/ }),
  });
  const names = doneList.getByRole("group");
  await expect(names).toHaveText([/Zweite erledigt/, /Erste erledigt/]);

  // Ticked off while the done section is open: it comes first, not last.
  // The checkbox input is hidden; its label takes the click.
  await page
    .getByRole("group", { name: "Noch offen" })
    .locator("label", { has: page.getByRole("checkbox") })
    .click();
  await expect(names).toHaveText([
    /Noch offen/,
    /Zweite erledigt/,
    /Erste erledigt/,
  ]);
  await expect(
    page.getByRole("group", { name: "Noch offen" }).getByRole("checkbox"),
  ).toBeChecked();
});
