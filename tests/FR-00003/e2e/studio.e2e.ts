// FR-00003 end-to-end tests: a real browser opens Content Studio through
// studio-web, which checks the Access token and calls studio-api through its
// service binding. Tokens come from the local key server, never from Access.
import { expect, test } from "@playwright/test";
import { KEY_SERVER, SUPERADMIN } from "./playwright.config";

async function tokenFor(email: string): Promise<string> {
  const response = await fetch(`${KEY_SERVER}/token?email=${encodeURIComponent(email)}`);
  return response.text();
}

test("FR-00003: the SuperAdmin signs in and sees the signed-in page with the studio-api status", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": await tokenFor(SUPERADMIN) },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  await expect(page.getByText(SUPERADMIN)).toBeVisible();
  await expect(page.getByText(/studio-api is running/i)).toBeVisible();
  await context.close();
});

test("FR-00003: anyone else who passes Access sees the not-allowed page", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": await tokenFor("someone@example.invalid") },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /not allowed/i })).toBeVisible();
  await expect(page.getByText(/studio-api is running/i)).toHaveCount(0);
  await context.close();
});

test("FR-00003: without an Access token, studio-web serves no page and no API response", async ({ request }) => {
  const page = await request.get("/");
  expect(page.status()).toBe(401);
  const api = await request.get("/api/me");
  expect(api.status()).toBe(401);
  expect((await api.json()).code).toBe("UNAUTHENTICATED");
});
