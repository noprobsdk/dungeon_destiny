// FR-00005: the app version check (DD-023). Plain functions that take their
// inputs explicitly, so they are tested directly.
import { APP_HEADERS, APP_PLATFORMS } from "@dungeon-destiny/contracts";
import type { AppPlatform, AppVersionData, VersionCheckResult } from "@dungeon-destiny/contracts";

export type ParsedAppHeaders =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "present"; platform: AppPlatform; build: number };

export type Thresholds = { minimumBuild: number; recommendedBuild: number };

// A build is digits only, at most 9 of them, so it is always a safe integer.
const BUILD = /^[0-9]{1,9}$/;

function isPlatform(value: string): value is AppPlatform {
  return (APP_PLATFORMS as readonly string[]).includes(value);
}

// Calls without either header, such as a monitor calling /health, are absent
// and not checked. A call with only one of them, or with a bad value, is
// invalid.
export function parseAppHeaders(headers: Headers): ParsedAppHeaders {
  const platform = headers.get(APP_HEADERS.platform);
  const build = headers.get(APP_HEADERS.build);
  if (platform === null && build === null) return { kind: "absent" };
  if (platform === null || build === null) return { kind: "invalid" };
  if (!isPlatform(platform) || !BUILD.test(build)) return { kind: "invalid" };
  return { kind: "present", platform, build: Number(build) };
}

const THRESHOLD_VARS: Record<AppPlatform, { minimum: string; recommended: string }> = {
  android: { minimum: "APP_MIN_BUILD_ANDROID", recommended: "APP_RECOMMENDED_BUILD_ANDROID" },
};

function wholeNumberAtLeastOne(value: unknown): number | null {
  if (typeof value !== "string" || !BUILD.test(value)) return null;
  const number = Number(value);
  return number >= 1 ? number : null;
}

// Reads a platform's thresholds from the Worker's configuration. Returns null
// when they are missing or invalid, so the caller can refuse to answer.
export function readThresholds(env: Record<string, unknown>, platform: AppPlatform): Thresholds | null {
  const names = THRESHOLD_VARS[platform];
  const minimumBuild = wholeNumberAtLeastOne(env[names.minimum]);
  const recommendedBuild = wholeNumberAtLeastOne(env[names.recommended]);
  if (minimumBuild === null || recommendedBuild === null) return null;
  if (minimumBuild > recommendedBuild) return null;
  return { minimumBuild, recommendedBuild };
}

const UPDATE_URL_VARS: Record<AppPlatform, string> = {
  android: "APP_UPDATE_URL_ANDROID",
};

// Reads a platform's update link from the Worker's configuration. Only an
// https address is used; anything else is null, so a bad link hides the
// app's Update button instead of stopping the version check.
export function readUpdateUrl(env: Record<string, unknown>, platform: AppPlatform): string | null {
  const value = env[UPDATE_URL_VARS[platform]];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) return null;
  if (!URL.canParse(value)) return null;
  return new URL(value).protocol === "https:" ? value : null;
}

export function evaluateBuild(
  platform: AppPlatform,
  build: number,
  thresholds: Thresholds,
  updateUrl: string | null,
): AppVersionData {
  return {
    platform,
    build,
    minimumBuild: thresholds.minimumBuild,
    recommendedBuild: thresholds.recommendedBuild,
    supported: build >= thresholds.minimumBuild,
    upToDate: build >= thresholds.recommendedBuild,
    updateUrl,
  };
}

export function versionCheckResult(data: AppVersionData): VersionCheckResult {
  if (!data.supported) return "updateRequired";
  if (!data.upToDate) return "updateAvailable";
  return "upToDate";
}
