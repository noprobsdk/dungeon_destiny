// FR-00004 tests for form validation and the Access check on Content
// Studio's pages: invalid fields are highlighted with a message before
// anything is sent, field errors from studio-api are shown on their fields,
// and people with users.manage can check that the Access group matches.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../apps/studio-web/src/app/App";
import { ALL, answer, at, body, person, roleEditor, userAnna } from "./api-stand-in";

afterEach(() => {
  vi.restoreAllMocks();
});

const me = (permissions: string[]) => ({ status: 200, body: body(person(permissions, permissions === ALL)) });

describe("FR-00004: form validation", () => {
  it("FR-00004: an invalid email address is highlighted with a message under the field, and nothing is sent", async () => {
    const requests = answer({ "GET /api/me": me(ALL), "GET /api/roles": { status: 200, body: body([roleEditor]) } });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    const email = await screen.findByLabelText(/email/i);
    await user.type(email, "not an email");
    await user.type(screen.getByLabelText(/name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Enter a plain email address.")).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("FR-00004: a missing role name is highlighted with a message, and nothing is sent", async () => {
    const requests = answer({ "GET /api/me": me(ALL), "GET /api/permissions": { status: 200, body: body([]) } });
    at("/roles/new");
    render(<App />);
    const user = userEvent.setup();
    const name = await screen.findByLabelText(/role name/i);
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Enter a role name.")).toBeTruthy();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("FR-00004: field errors from studio-api are shown on their fields", async () => {
    answer({
      "GET /api/me": me(ALL),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "POST /api/users": {
        status: 400,
        body: body([{ path: ["email"], message: "This address cannot be used." }], "VALIDATION_FAILED", "The input is not valid."),
      },
    });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    const email = await screen.findByLabelText(/email/i);
    await user.type(email, "anna@example.invalid");
    await user.type(screen.getByLabelText(/name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("This address cannot be used.")).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("FR-00004: Access check", () => {
  it("FR-00004: someone with users.manage can check that the Access group matches the users, and sees any differences", async () => {
    answer({
      "GET /api/me": me(ALL),
      "GET /api/users": { status: 200, body: body([userAnna]) },
      "GET /api/access-sync": {
        status: 200,
        body: body({ inSync: false, missingFromGroup: ["anna@example.invalid"], notActiveUsers: ["old@example.invalid"] }),
      },
    });
    at("/users");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /check access/i }));
    const result = await screen.findByRole("alert", { name: /access does not match/i });
    expect(within(result).getByText(/missing from the access group/i)).toBeTruthy();
    expect(within(result).getByText("anna@example.invalid")).toBeTruthy();
    expect(within(result).getByText("old@example.invalid")).toBeTruthy();
  });

  it("FR-00004: someone without users.manage sees no Access check", async () => {
    answer({ "GET /api/me": me(["users.view"]), "GET /api/users": { status: 200, body: body([userAnna]) } });
    at("/users");
    render(<App />);
    expect(await screen.findByText("anna@example.invalid")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /check access/i })).toBeNull();
  });
});

describe("FR-00004: after saving", () => {
  it("FR-00004: after a user is saved, the page goes back to the Users list and shows the notification", async () => {
    answer({
      "GET /api/me": me(ALL),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "GET /api/users": { status: 200, body: body([userAnna]) },
      "POST /api/users": { status: 200, body: body(userAnna, null, "User created.") },
    });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), "anna@example.invalid");
    await user.type(screen.getByLabelText(/name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("User created.")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Users", level: 1 })).toBeTruthy();
    expect(window.location.pathname).toBe("/users");
  });

  it("FR-00004: after a role is saved, the page goes back to the Roles list and shows the notification", async () => {
    answer({
      "GET /api/me": me(ALL),
      "GET /api/permissions": { status: 200, body: body([]) },
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "POST /api/roles": { status: 200, body: body(roleEditor, null, "Role created.") },
    });
    at("/roles/new");
    render(<App />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/role name/i), "editor");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Role created.")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Roles", level: 1 })).toBeTruthy();
    expect(window.location.pathname).toBe("/roles");
  });
});

describe("FR-00004: Back", () => {
  it("FR-00004: Back on the user page returns to the Users list without saving", async () => {
    const requests = answer({
      "GET /api/me": me(ALL),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "GET /api/users": { status: 200, body: body([userAnna]) },
    });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), "anna@example.invalid");
    await user.click(screen.getByRole("link", { name: /back/i }));
    expect(await screen.findByRole("heading", { name: "Users", level: 1 })).toBeTruthy();
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("FR-00004: Back on the role page returns to the Roles list", async () => {
    answer({
      "GET /api/me": me(ALL),
      "GET /api/permissions": { status: 200, body: body([]) },
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
    });
    at("/roles/new");
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /back/i }));
    expect(await screen.findByRole("heading", { name: "Roles", level: 1 })).toBeTruthy();
  });
});
