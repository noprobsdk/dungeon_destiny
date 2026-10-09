// FR-00003: checks the Cloudflare Access token that Access adds to every
// request in the Cf-Access-Jwt-Assertion header, as Cloudflare recommends:
// the signature against the team's public keys, the issuer (the team
// domain), the audience (the Access application's AUD tag), and the expiry.
// Only RS256 is accepted.
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { StaffIdentity } from "@dungeon-destiny/contracts";

// Access's public keys per team domain. These are public, immutable-per-key
// data, not request data, so they may be cached for the isolate's lifetime;
// jose refetches them when Access rotates its keys.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySet(teamDomain: string) {
  let keys = keySets.get(teamDomain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    keySets.set(teamDomain, keys);
  }
  return keys;
}

// Returns the signed-in person, or null when the token is missing or invalid,
// or when studio-web is not configured with a team domain and audience tag.
export async function verifyAccessToken(
  token: string | null,
  teamDomain: string,
  audience: string,
): Promise<StaffIdentity | null> {
  if (!token || teamDomain === "" || audience === "") return null;
  try {
    const { payload } = await jwtVerify(token, keySet(teamDomain), {
      issuer: teamDomain,
      audience,
      algorithms: ["RS256"],
    });
    const email = payload["email"];
    if (typeof email !== "string" || email === "") return null;
    return { email };
  } catch {
    return null;
  }
}
