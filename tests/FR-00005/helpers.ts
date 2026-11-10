// FR-00005: shared helpers for the gateway tests.
import { exports } from "cloudflare:workers";
import type { ApiResponse } from "@dungeon-destiny/contracts";

export const BASE = "https://dd-dev-gateway.example";

export function appHeaders(platform: string, build: string): Record<string, string> {
  return { "X-App-Platform": platform, "X-App-Build": build };
}

export async function call<T = unknown>(path: string, init?: RequestInit) {
  const response = await exports.default.fetch(`${BASE}${path}`, init);
  const body = (await response.json()) as ApiResponse<T>;
  return { response, body };
}
