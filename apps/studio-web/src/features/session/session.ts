// FR-00003: who is signed in, from GET /api/me.
import type { StaffMember } from "@dungeon-destiny/contracts";
import { getApi } from "../../shared/api-client";

export type Session =
  | { state: "loading" }
  | { state: "signed-in"; member: StaffMember }
  | { state: "not-allowed" }
  | { state: "sign-in" }
  | { state: "error" };

export async function loadSession(): Promise<Session> {
  const result = await getApi<StaffMember | null>("/api/me");
  if (result.kind !== "response") return { state: "error" };
  const { body } = result;
  if (body.status === "ok" && body.data) return { state: "signed-in", member: body.data };
  if (body.code === "NOT_STAFF") return { state: "not-allowed" };
  if (body.code === "UNAUTHENTICATED") return { state: "sign-in" };
  return { state: "error" };
}
