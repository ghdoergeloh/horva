import { expect, test } from "@playwright/test";

// The web app can be installed and shows the Horva icon in tabs.

test("the page links a manifest whose icons load", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(href ?? "")).json()) as {
    icons: { src: string }[];
  };
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
  }
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect((await request.get(favicon ?? "")).ok()).toBe(true);
});
