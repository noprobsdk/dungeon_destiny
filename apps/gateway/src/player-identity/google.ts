// FR-00006: checks a Play Games sign-in with Google (DD-024). The client's
// one-time server auth code is exchanged at Google's OAuth token endpoint with
// the web client ID and secret, then the player's ID is read from the Play
// Games Services API. Google's answer, not the client, decides the player ID.
// Nothing Google returns is logged or stored except that ID.

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const PLAY_GAMES_PLAYER_URL = "https://games.googleapis.com/games/v1/players/me";

// Each call to Google gives up after this long.
const GOOGLE_TIMEOUT_MS = 5_000;

export type GoogleSignIn =
  | { kind: "ok"; playerId: string }
  // Google refused the code: it is wrong, used, or expired.
  | { kind: "refused" }
  // Google could not be reached or answered with an error.
  | { kind: "unavailable" };

export type GoogleClient = { clientId: string; clientSecret: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Only the step and the HTTP status are logged, never Google's answer.
function unavailable(step: "token" | "player", status: number | null): GoogleSignIn {
  console.warn(JSON.stringify({ event: "googleSignInUnavailable", step, status }));
  return { kind: "unavailable" };
}

export async function confirmPlayGamesPlayer(serverAuthCode: string, client: GoogleClient): Promise<GoogleSignIn> {
  let accessToken: string;
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: serverAuthCode,
        client_id: client.clientId,
        client_secret: client.clientSecret,
        // Play Games server auth codes are exchanged without a redirect URI.
        redirect_uri: "",
      }),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
    const body = await readJson(response);
    if (response.status === 400 && isRecord(body) && body.error === "invalid_grant") return { kind: "refused" };
    if (!response.ok) return unavailable("token", response.status);
    if (!isRecord(body) || typeof body.access_token !== "string" || body.access_token === "") {
      return unavailable("token", response.status);
    }
    accessToken = body.access_token;
  } catch {
    return unavailable("token", null);
  }

  try {
    const response = await fetch(PLAY_GAMES_PLAYER_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
    if (!response.ok) return unavailable("player", response.status);
    const body = await readJson(response);
    if (!isRecord(body) || typeof body.playerId !== "string" || body.playerId === "" || body.playerId.length > 255) {
      return unavailable("player", response.status);
    }
    return { kind: "ok", playerId: body.playerId };
  } catch {
    return unavailable("player", null);
  }
}
