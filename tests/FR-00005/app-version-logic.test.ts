// FR-00005 tests for the version-check logic in the gateway Worker (DD-023).
// The functions are plain and take their inputs explicitly.
import { describe, expect, it } from "vitest";
import {
  evaluateBuild,
  parseAppHeaders,
  readThresholds,
  readUpdateUrl,
  versionCheckResult,
} from "../../apps/gateway/src/api-gateway/app-version";

const headers = (init: Record<string, string>) => new Headers(init);

describe("FR-00005: parseAppHeaders", () => {
  it("FR-00005: no app headers is absent, not invalid", () => {
    expect(parseAppHeaders(headers({}))).toEqual({ kind: "absent" });
  });

  it("FR-00005: a known platform and a whole-number build are present", () => {
    expect(parseAppHeaders(headers({ "X-App-Platform": "android", "X-App-Build": "1" }))).toEqual({
      kind: "present",
      platform: "android",
      build: 1,
    });
    expect(parseAppHeaders(headers({ "x-app-platform": "android", "x-app-build": "0" }))).toEqual({
      kind: "present",
      platform: "android",
      build: 0,
    });
    expect(parseAppHeaders(headers({ "X-App-Platform": "android", "X-App-Build": "999999999" }))).toEqual({
      kind: "present",
      platform: "android",
      build: 999999999,
    });
  });

  it("FR-00005: only one of the two headers is invalid", () => {
    expect(parseAppHeaders(headers({ "X-App-Platform": "android" }))).toEqual({ kind: "invalid" });
    expect(parseAppHeaders(headers({ "X-App-Build": "1" }))).toEqual({ kind: "invalid" });
  });

  it("FR-00005: an unknown platform is invalid", () => {
    for (const platform of ["ios", "Android", "", "windows"]) {
      expect(parseAppHeaders(headers({ "X-App-Platform": platform, "X-App-Build": "1" }))).toEqual({
        kind: "invalid",
      });
    }
  });

  it("FR-00005: a build that is not digits only, or has more than 9 digits, is invalid", () => {
    // Header values are trimmed by HTTP itself, so " 1" arrives as "1".
    for (const build of ["", "-1", "1.0", "1e3", "1 1", "abc", "0x10", "1000000000"]) {
      expect(parseAppHeaders(headers({ "X-App-Platform": "android", "X-App-Build": build }))).toEqual({
        kind: "invalid",
      });
    }
  });
});

describe("FR-00005: readThresholds", () => {
  it("FR-00005: reads the Android thresholds as whole numbers", () => {
    expect(readThresholds({ APP_MIN_BUILD_ANDROID: "1", APP_RECOMMENDED_BUILD_ANDROID: "3" }, "android")).toEqual({
      minimumBuild: 1,
      recommendedBuild: 3,
    });
  });

  it("FR-00005: missing, non-integer, or zero thresholds are a misconfiguration", () => {
    const bad = [
      {},
      { APP_MIN_BUILD_ANDROID: "1" },
      { APP_MIN_BUILD_ANDROID: "0", APP_RECOMMENDED_BUILD_ANDROID: "1" },
      { APP_MIN_BUILD_ANDROID: "1.5", APP_RECOMMENDED_BUILD_ANDROID: "2" },
      { APP_MIN_BUILD_ANDROID: "one", APP_RECOMMENDED_BUILD_ANDROID: "2" },
    ];
    for (const env of bad) expect(readThresholds(env, "android")).toBeNull();
  });

  it("FR-00005: a minimum above the recommended build is a misconfiguration", () => {
    expect(readThresholds({ APP_MIN_BUILD_ANDROID: "3", APP_RECOMMENDED_BUILD_ANDROID: "2" }, "android")).toBeNull();
  });
});

describe("FR-00005: readUpdateUrl", () => {
  it("FR-00005: an https address is the update link", () => {
    const url = "https://store.example.test/dungeon-destiny?id=1";
    expect(readUpdateUrl({ APP_UPDATE_URL_ANDROID: url }, "android")).toBe(url);
  });

  it("FR-00005: a missing, empty, or non-https link is null and never an error", () => {
    const bad = [
      {},
      { APP_UPDATE_URL_ANDROID: "" },
      { APP_UPDATE_URL_ANDROID: "http://store.example.test/" },
      { APP_UPDATE_URL_ANDROID: "market://details?id=com.dungeondestiny.game" },
      { APP_UPDATE_URL_ANDROID: "javascript:alert(1)" },
      { APP_UPDATE_URL_ANDROID: "not a url" },
      { APP_UPDATE_URL_ANDROID: " https://store.example.test/" },
      { APP_UPDATE_URL_ANDROID: 1 },
    ];
    for (const env of bad) expect(readUpdateUrl(env, "android")).toBeNull();
  });
});

describe("FR-00005: evaluateBuild and versionCheckResult", () => {
  const thresholds = { minimumBuild: 2, recommendedBuild: 4 };
  const url = "https://store.example.test/dungeon-destiny";

  it("FR-00005: the answer carries the update link, or null", () => {
    expect(evaluateBuild("android", 4, thresholds, url).updateUrl).toBe(url);
    expect(evaluateBuild("android", 1, thresholds, null).updateUrl).toBeNull();
  });

  it("FR-00005: a build at or above the recommended build is supported and up to date", () => {
    for (const build of [4, 5]) {
      const data = evaluateBuild("android", build, thresholds, null);
      expect(data).toEqual({
        platform: "android",
        build,
        minimumBuild: 2,
        recommendedBuild: 4,
        supported: true,
        upToDate: true,
        updateUrl: null,
      });
      expect(versionCheckResult(data)).toBe("upToDate");
    }
  });

  it("FR-00005: a build between the minimum and the recommended build is supported but not up to date", () => {
    for (const build of [2, 3]) {
      const data = evaluateBuild("android", build, thresholds, null);
      expect(data.supported).toBe(true);
      expect(data.upToDate).toBe(false);
      expect(versionCheckResult(data)).toBe("updateAvailable");
    }
  });

  it("FR-00005: a build below the minimum is not supported", () => {
    const data = evaluateBuild("android", 1, thresholds, null);
    expect(data.supported).toBe(false);
    expect(data.upToDate).toBe(false);
    expect(versionCheckResult(data)).toBe("updateRequired");
  });
});
