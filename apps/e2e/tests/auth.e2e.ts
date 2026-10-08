import { expect, test } from "@playwright/test";

import { account, signUp } from "../src/api";

// The browser app starts in German; the gate in front of it is the login.

test("a new user signs up and sees the day overview", async ({ page }) => {
  const user = account();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Noch kein Konto? Registrieren" })
    .click();
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Registrieren", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Tagesübersicht" }),
  ).toBeVisible();
});

test("an existing user signs in", async ({ page }) => {
  const user = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/");
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Tagesübersicht" }),
  ).toBeVisible();
});

test("a wrong password shows an error and keeps the user out", async ({
  page,
}) => {
  const user = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/");
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill("not-the-password");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  await expect(page.getByText(/invalid/i)).toBeVisible();
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
});

test("the API answers 401 without a session", async ({ page }) => {
  const response = await page.request.post("/api/rpc/project/list", {
    data: { json: {} },
  });
  expect(response.status()).toBe(401);
});
