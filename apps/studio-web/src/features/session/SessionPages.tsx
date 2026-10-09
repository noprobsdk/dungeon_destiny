// FR-00003: the pages shown when someone may not use Content Studio.
export function NotAllowedPage() {
  return (
    <main className="page">
      <h1>Not allowed</h1>
      <p>You are signed in, but you are not allowed to use Content Studio.</p>
    </main>
  );
}

export function SignInPage() {
  return (
    <main className="page">
      <h1>Sign in again</h1>
      <p>Your sign-in is missing or has expired. Reload the page to sign in with a one-time PIN.</p>
    </main>
  );
}

export function ErrorPage() {
  return (
    <main className="page">
      <h1>Something went wrong</h1>
      <p>Content Studio could not be loaded. Try again later.</p>
    </main>
  );
}
