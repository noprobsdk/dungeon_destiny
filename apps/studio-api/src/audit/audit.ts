// FR-00004: audit records for every change to a user or a role (DD-008). They
// are written in the same D1 batch as the change, so a change is never stored
// without its record.
import { auditEvents } from "../db/schema";
import { now } from "../shared/context";
import type { RequestContext } from "../shared/context";

export function auditInsert(
  context: RequestContext,
  action: string,
  targetType: "user" | "role",
  targetId: string,
  before: unknown,
  after: unknown,
) {
  return context.db.insert(auditEvents).values({
    id: crypto.randomUUID(),
    occurredAt: now(),
    actorEmail: context.actor.email,
    action,
    targetType,
    targetId,
    before: before === null ? null : JSON.stringify(before),
    after: after === null ? null : JSON.stringify(after),
    requestId: context.requestId,
  });
}
