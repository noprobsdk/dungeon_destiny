// FR-00004: a local stand-in for Cloudflare's API, used only by the
// end-to-end test. It holds the members of one Access group, answers
// studio-api's GET and PUT for that group when the fake token is sent, and
// lets the test read the members at /members. It listens on 127.0.0.1 only.
//
// Usage: node tests/FR-00004/e2e/cloudflare-api.mjs <port> <account> <group> <token> <superadmin>
import { createServer } from "node:http";

const [port, account, group, token, superadmin] = process.argv.slice(2);
const groupPath = `/client/v4/accounts/${account}/access/groups/${group}`;
let members = [superadmin];

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function result() {
  return { success: true, errors: [], result: { id: group, name: "Content Studio users", include: members.map((email) => ({ email: { email } })) } };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/members") return send(response, 200, members);
  if (url.pathname !== groupPath) return send(response, 404, { success: false });
  if (request.headers.authorization !== `Bearer ${token}`) return send(response, 403, { success: false, errors: [{ code: 10000 }] });
  if (request.method === "GET") return send(response, 200, result());
  if (request.method !== "PUT") return send(response, 405, { success: false });
  let text = "";
  request.on("data", (chunk) => (text += chunk));
  request.on("end", () => {
    const body = JSON.parse(text);
    members = body.include.map((rule) => rule.email.email);
    send(response, 200, result());
  });
});

server.listen(Number(port), "127.0.0.1", () => {
  console.log(`FR-00004 Cloudflare API stand-in listening on 127.0.0.1:${port}`);
});
