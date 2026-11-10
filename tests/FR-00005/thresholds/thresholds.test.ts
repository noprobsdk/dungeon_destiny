// FR-00005 tests for the version check with raised thresholds: the minimum
// supported build is 2 and the recommended build is 3 (test values only).
import type { AppVersionData } from "@dungeon-destiny/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appHeaders, call } from "../helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FR-00005: raised thresholds", () => {
  it("FR-00005: a build below the recommended build is supported but not up to date", async () => {
    const { response, body } = await call<AppVersionData>("/app/version", { headers: appHeaders("android", "2") });
    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      platform: "android",
      build: 2,
      minimumBuild: 2,
      recommendedBuild: 3,
      supported: true,
      upToDate: false,
      updateUrl: "https://play.google.com/store/apps/details?id=com.dungeondestiny.game.dev",
    });
  });

  it("FR-00005: a build below the recommended build may still use other calls", async () => {
    const { response } = await call("/health", { headers: appHeaders("android", "2") });
    expect(response.status).toBe(200);
  });

  it("FR-00005: a build below the minimum is not supported and is refused on other calls", async () => {
    const version = await call<AppVersionData>("/app/version", { headers: appHeaders("android", "1") });
    expect(version.response.status).toBe(200);
    expect(version.body.data.supported).toBe(false);
    const health = await call("/health", { headers: appHeaders("android", "1") });
    expect(health.response.status).toBe(426);
    expect(health.body.code).toBe("APP_UPDATE_REQUIRED");
  });

  it("FR-00005: the log writes updateAvailable for a build below the recommended build", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    await call("/app/version", { headers: appHeaders("android", "2") });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!).versionCheck).toBe("updateAvailable");
  });
});
