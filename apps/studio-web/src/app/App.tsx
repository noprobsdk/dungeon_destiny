// FR-00003, FR-00004: Content Studio's root component. It sets up the theme,
// notifications, data loading, and routing, loads who is signed in, and shows
// the layout and pages, or the page that says why they cannot continue.
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { SignedInPerson } from "@dungeon-destiny/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { HomePage } from "../features/home/HomePage";
import { PermissionsPage } from "../features/permissions/PermissionsPage";
import { RolePage } from "../features/roles/RolePage";
import { RolesPage } from "../features/roles/RolesPage";
import { ErrorPage, NotAllowedPage, SignInPage } from "../features/session/SessionPages";
import { loadSession } from "../features/session/session";
import type { Session } from "../features/session/session";
import { UserPage } from "../features/users/UserPage";
import { UsersPage } from "../features/users/UsersPage";
import { Require } from "../shared/ui";
import { Layout } from "./Layout";
import { theme } from "./theme";

function Pages({ person }: { person: SignedInPerson }) {
  return (
    <Layout person={person}>
      <Routes>
        <Route path="/" element={<HomePage person={person} />} />
        <Route path="/users" element={<Require person={person} permission="users.view"><UsersPage person={person} /></Require>} />
        <Route path="/users/new" element={<Require person={person} permission="users.manage"><UserPage person={person} /></Require>} />
        <Route path="/users/:id" element={<Require person={person} permission="users.view"><UserPage person={person} /></Require>} />
        <Route path="/roles" element={<Require person={person} permission="roles.view"><RolesPage person={person} /></Require>} />
        <Route path="/roles/new" element={<Require person={person} permission="roles.manage"><RolePage person={person} /></Require>} />
        <Route path="/roles/:id" element={<Require person={person} permission="roles.view"><RolePage person={person} /></Require>} />
        <Route path="/permissions" element={<Require person={person} permission="roles.view"><PermissionsPage /></Require>} />
        <Route path="*" element={<HomePage person={person} />} />
      </Routes>
    </Layout>
  );
}

function SignedIn() {
  const [session, setSession] = useState<Session>({ state: "loading" });

  useEffect(() => {
    let active = true;
    void loadSession().then((loaded) => {
      if (active) setSession(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  switch (session.state) {
    case "loading":
      return <main className="page" aria-busy="true">Loading Content Studio…</main>;
    case "not-allowed":
      return <NotAllowedPage />;
    case "sign-in":
      return <SignInPage />;
    case "error":
      return <ErrorPage />;
    case "signed-in":
      return <Pages person={session.person} />;
  }
}

export function App() {
  // One client per app instance, never shared between requests or tests.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SignedIn />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
