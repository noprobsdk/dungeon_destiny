// FR-00004 tests for Content Studio's layout and pages, rendered in jsdom with
// a stand-in /api. They check what each person sees, the loading and saving
// states, and the notifications.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../apps/studio-web/src/app/App";
import { ALL, answer, at, body, held, permissionList, person, roleEditor, userAnna } from "./api-stand-in";

afterEach(() => {
  vi.restoreAllMocks();
});

const me = (permissions: string[], superadmin = false) => ({ status: 200, body: body(person(permissions, superadmin)) });
const health = { status: 200, body: body(null) };

describe("FR-00004: layout", () => {
  it("FR-00004: the menu shows only the pages the signed-in person may use, and a Sign out link", async () => {
    answer({ "GET /api/me": me(["users.view"]), "GET /api/health": health });
    at("/");
    render(<App />);
    const nav = await screen.findByRole("navigation");
    expect(within(nav).getByRole("link", { name: /users/i })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /roles/i })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /permissions/i })).toBeNull();
    const signOut = screen.getByRole("link", { name: /sign out/i });
    expect(signOut.getAttribute("href")).toBe("/cdn-cgi/access/logout");
  });

  it("FR-00004: the SuperAdmin sees every page in the menu", async () => {
    answer({ "GET /api/me": me(ALL, true), "GET /api/health": health });
    at("/");
    render(<App />);
    const nav = await screen.findByRole("navigation");
    for (const name of [/users/i, /roles/i, /permissions/i]) {
      expect(within(nav).getByRole("link", { name })).toBeTruthy();
    }
  });

  it("FR-00004: a page the person may not use shows that they have no permission", async () => {
    answer({ "GET /api/me": me(["users.view"]), "GET /api/health": health });
    at("/roles");
    render(<App />);
    expect(await screen.findByText(/you do not have permission/i)).toBeTruthy();
  });
});

describe("FR-00004: users", () => {
  it("FR-00004: the Users list shows a loading state, then the users and the SuperAdmin as a fixed row", async () => {
    const wait = held();
    answer({
      "GET /api/me": me(ALL, true),
      "GET /api/users": { status: 200, body: body([userAnna]), hold: wait.promise },
    });
    at("/users");
    render(<App />);
    expect(await screen.findByLabelText(/loading users/i)).toBeTruthy();
    await act(async () => wait.release());
    expect(await screen.findByText("anna@example.invalid")).toBeTruthy();
    expect(screen.getByText("editor")).toBeTruthy();
    expect(screen.getByText(/superadmin/i)).toBeTruthy();
    expect(screen.queryByLabelText(/loading users/i)).toBeNull();
  });

  it("FR-00004: while a new user is saved, Save shows a spinner and is disabled, a second click sends nothing, and a notification follows", async () => {
    const wait = held();
    const requests = answer({
      "GET /api/me": me(ALL, true),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "GET /api/users": { status: 200, body: body([]) },
      "POST /api/users": { status: 200, body: body(userAnna, null, "User created."), hold: wait.promise },
    });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), "anna@example.invalid");
    await user.type(screen.getByLabelText(/name/i), "Anna");
    await user.click(await screen.findByRole("checkbox", { name: /editor/i }));
    const save = screen.getByRole("button", { name: /save/i });
    await user.click(save);
    await waitFor(() => expect(save.getAttribute("data-loading")).toBe("true"));
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(save);
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
    expect(requests.find((r) => r.method === "POST")?.body).toEqual({
      email: "anna@example.invalid",
      displayName: "Anna",
      roleIds: [roleEditor.id],
    });
    await act(async () => wait.release());
    expect(await screen.findByText("User created.")).toBeTruthy();
  });

  it("FR-00004: when saving fails, an error notification shows the message and the form keeps its values", async () => {
    answer({
      "GET /api/me": me(ALL, true),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      "POST /api/users": { status: 409, body: body(null, "CONFLICT", "A user with this email address already exists.") },
    });
    at("/users/new");
    render(<App />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), "anna@example.invalid");
    await user.type(screen.getByLabelText(/name/i), "Anna");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("A user with this email address already exists.")).toBeTruthy();
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("anna@example.invalid");
    expect(screen.getByRole("button", { name: /save/i }).getAttribute("data-loading")).toBeNull();
  });

  it("FR-00004: a user can be deactivated from the user page", async () => {
    const requests = answer({
      "GET /api/me": me(ALL, true),
      "GET /api/roles": { status: 200, body: body([roleEditor]) },
      [`GET /api/users/${userAnna.id}`]: { status: 200, body: body(userAnna) },
      [`POST /api/users/${userAnna.id}/deactivate`]: {
        status: 200,
        body: body({ ...userAnna, status: "deactivated" }, null, "User deactivated."),
      },
    });
    at(`/users/${userAnna.id}`);
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /deactivate/i }));
    const confirm = await screen.findByRole("button", { name: /yes, deactivate/i });
    await user.click(confirm);
    expect(await screen.findByText("User deactivated.")).toBeTruthy();
    expect(requests.some((r) => r.method === "POST" && r.path.endsWith("/deactivate"))).toBe(true);
  });

  it("FR-00004: someone with users.view but not users.manage sees no New user button", async () => {
    answer({ "GET /api/me": me(["users.view"]), "GET /api/users": { status: 200, body: body([userAnna]) } });
    at("/users");
    render(<App />);
    expect(await screen.findByText("anna@example.invalid")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /new user/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /new user/i })).toBeNull();
  });
});

describe("FR-00004: roles and permissions", () => {
  it("FR-00004: the Roles list shows each role with its numbers of users and permissions", async () => {
    answer({ "GET /api/me": me(ALL, true), "GET /api/roles": { status: 200, body: body([roleEditor]) } });
    at("/roles");
    render(<App />);
    const row = (await screen.findByText("editor")).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getAllByText("1").length).toBeGreaterThanOrEqual(2);
  });

  it("FR-00004: the Role page lists the permissions grouped by area, with each permission's description and purpose", async () => {
    answer({
      "GET /api/me": me(ALL, true),
      [`GET /api/roles/${roleEditor.id}`]: { status: 200, body: body(roleEditor) },
      "GET /api/permissions": { status: 200, body: body(permissionList) },
    });
    at(`/roles/${roleEditor.id}`);
    render(<App />);
    const checkbox = await screen.findByRole("checkbox", { name: /users\.view/i });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: /roles\.manage/i }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText("See the list of users.")).toBeTruthy();
    expect(screen.getByText("For team leads who need to know who has access.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Users" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Roles" })).toBeTruthy();
  });

  it("FR-00004: the Permissions page is read-only and shows description, purpose, the Feature Request, and the roles", async () => {
    answer({ "GET /api/me": me(["roles.view"]), "GET /api/permissions": { status: 200, body: body(permissionList) } });
    at("/permissions");
    render(<App />);
    expect(await screen.findByText("users.view")).toBeTruthy();
    expect(screen.getByText("See the list of users.")).toBeTruthy();
    expect(screen.getByText("For team leads who need to know who has access.")).toBeTruthy();
    expect(screen.getAllByText("FR-00004").length).toBe(2);
    expect(screen.getByText("editor")).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
