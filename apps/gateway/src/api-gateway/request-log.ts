// FR-00005: the gateway's request log. One JSON line per request, kept in
// Workers Logs. It never contains IP addresses, other request headers, query
// strings, tokens, or personal data: only the fields below.
import type { AppPlatform, ErrorCode, VersionCheckResult } from "@dungeon-destiny/contracts";

export type RequestLogLine = {
  event: "request";
  requestId: string;
  method: string;
  path: string;
  status: number;
  code: ErrorCode | null;
  durationMs: number;
  environment: string;
  versionId: string;
  platform?: AppPlatform;
  build?: number;
  versionCheck?: VersionCheckResult;
};

export function writeRequestLog(line: RequestLogLine): void {
  console.log(JSON.stringify(line));
}
