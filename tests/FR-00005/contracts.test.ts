// FR-00005 tests for the version-check types and error codes in
// packages/contracts (DD-019, DD-023).
import { APP_HEADERS, APP_PLATFORMS, ERROR_CODES, VERSION_CHECK_RESULTS } from "@dungeon-destiny/contracts";
import type { AppPlatform, AppVersionData, ErrorCode, VersionCheckResult } from "@dungeon-destiny/contracts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("FR-00005: packages/contracts", () => {
  it("FR-00005: defines the app headers and the android platform", () => {
    expect(APP_HEADERS).toEqual({ platform: "X-App-Platform", build: "X-App-Build" });
    expect(APP_PLATFORMS).toEqual(["android"]);
    expectTypeOf<AppPlatform>().toEqualTypeOf<"android">();
  });

  it("FR-00005: defines the /app/version data type", () => {
    expectTypeOf<AppVersionData>().toEqualTypeOf<{
      platform: AppPlatform;
      build: number;
      minimumBuild: number;
      recommendedBuild: number;
      supported: boolean;
      upToDate: boolean;
      updateUrl: string | null;
    }>();
  });

  it("FR-00005: defines the version check results written to the log", () => {
    expect(VERSION_CHECK_RESULTS).toEqual(["upToDate", "updateAvailable", "updateRequired", "invalidHeaders"]);
    expectTypeOf<VersionCheckResult>().toEqualTypeOf<
      "upToDate" | "updateAvailable" | "updateRequired" | "invalidHeaders"
    >();
  });

  it("FR-00005: defines the new error codes", () => {
    expect(ERROR_CODES.INVALID_APP_HEADERS).toBe("INVALID_APP_HEADERS");
    expect(ERROR_CODES.APP_UPDATE_REQUIRED).toBe("APP_UPDATE_REQUIRED");
    expect(ERROR_CODES.SERVER_MISCONFIGURED).toBe("SERVER_MISCONFIGURED");
    expectTypeOf<"INVALID_APP_HEADERS" | "APP_UPDATE_REQUIRED" | "SERVER_MISCONFIGURED">().toExtend<ErrorCode>();
  });
});
