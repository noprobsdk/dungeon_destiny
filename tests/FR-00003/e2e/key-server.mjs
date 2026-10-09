// FR-00003: a local stand-in for Cloudflare Access's key server, used only by
// the end-to-end test. It makes a fresh RSA key pair at start, serves the
// public key where studio-web looks for Access's keys, and signs test tokens
// in the form Access uses. It listens on 127.0.0.1 only.
//
// Usage: node tests/FR-00003/e2e/key-server.mjs <port> <audience>
import { createServer } from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const port = Number(process.argv[2] ?? "9787");
const audience = process.argv[3] ?? "fr-00003-e2e-audience";
const issuer = `http://127.0.0.1:${port}`;
const kid = "fr-00003-e2e-key";

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const jwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", issuer);
  if (url.pathname === "/cdn-cgi/access/certs") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  if (url.pathname === "/token") {
    const email = url.searchParams.get("email") ?? "";
    const token = await new SignJWT({ email, type: "app" })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(`e2e-${email}`)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(token);
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`FR-00003 key server listening on ${issuer}`);
});
