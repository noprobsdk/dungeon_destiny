// FR-00003: Content Studio's root component. It loads who is signed in and
// shows the signed-in page, or the page that says why they cannot continue.
import { useEffect, useState } from "react";
import { ServiceStatus } from "../features/status/ServiceStatus";
import { ErrorPage, NotAllowedPage, SignInPage } from "../features/session/SessionPages";
import { loadSession } from "../features/session/session";
import type { Session } from "../features/session/session";

export function App() {
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
      return (
        <main className="page">
          <h1>Welcome to Content Studio</h1>
          <p>
            Signed in as <strong>{session.member.email}</strong> ({session.member.role}).
          </p>
          <ServiceStatus />
        </main>
      );
  }
}
