// FR-00004 end-to-end test: in a real browser, the SuperAdmin creates a role
// and a user; the user is added to the Access group and sees only what the
// role allows; after deactivation they are removed from the group and
// refused. Tokens come from the local key server, the database is a fresh
// local Content D1, and Cloudflare's API is a local stand-in.
import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { CLOUDFLARE_API, KEY_SERVER, SUPERADMIN } from "../../FR-00003/e2e/playwright.config";

const ANNA = "anna.e2e@example.invalid";

async function signedIn(browser: Browser, email: string) {
  const token = await (await fetch(`${KEY_SERVER}/token?email=${encodeURIComponent(email)}`)).text();
  const context = await browser.newContext({ extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": token } });
  return { context, page: await context.newPage() };
}

async function members(): Promise<string[]> {
  return (await (await fetch(`${CLOUDFLARE_API}/members`)).json()) as string[];
}

test("FR-00004: the SuperAdmin creates a role and a user, who is added to Access and sees only what the role allows", async ({ browser }) => {
  const admin = await signedIn(browser, SUPERADMIN);
  await admin.page.goto("/roles/new");
  await admin.page.getByLabel("Role name").fill("e2e-viewer");
  await admin.page.getByRole("checkbox", { name: "users.view" }).check();
  await admin.page.getByRole("button", { name: "Save" }).click();
  await expect(admin.page.getByText("Role created.")).toBeVisible();

  await admin.page.goto("/users/new");
  await admin.page.getByLabel("Email").fill(ANNA);
  await admin.page.getByLabel("Name").fill("Anna");
  await admin.page.getByRole("checkbox", { name: "e2e-viewer" }).check();
  await admin.page.getByRole("button", { name: "Save" }).click();
  await expect(admin.page.getByText("User created.")).toBeVisible();
  expect(await members()).toContain(ANNA);

  const anna = await signedIn(browser, ANNA);
  await anna.page.goto("/");
  const nav = anna.page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Roles" })).toHaveCount(0);
  await anna.page.goto("/users");
  await expect(anna.page.getByText(ANNA)).toBeVisible();
  await expect(anna.page.getByRole("link", { name: "New user" })).toHaveCount(0);

  await admin.page.goto("/users");
  await admin.page.getByRole("link", { name: ANNA }).click();
  await admin.page.getByRole("button", { name: "Deactivate" }).click();
  await admin.page.getByRole("button", { name: "Yes, deactivate" }).click();
  await expect(admin.page.getByText("User deactivated.")).toBeVisible();
  expect(await members()).not.toContain(ANNA);

  await anna.page.goto("/");
  await expect(anna.page.getByRole("heading", { name: /not allowed/i })).toBeVisible();
  await admin.context.close();
  await anna.context.close();
});
