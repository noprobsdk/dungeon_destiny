// FR-00005 tests for GET /app/version and the build check in the gateway
// Worker (DD-023), with the Worker's dev configuration: both Android
// thresholds are 1.
import { env } from "cloudflare:workers";
import type { AppVersionData } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import { readThresholds, readUpdateUrl } from "../../apps/gateway/src/api-gateway/app-version";
import { appHeaders, call } from "./helpers";

describe("FR-00005: dev thresholds", () => {
  it("FR-00005: the dev Android thresholds are valid whole numbers of at least 1, minimum not above recommended", () => {
    const thresholds = readThresholds(env as unknown as Record<string, unknown>, "android");
    expect(thresholds).not.toBeNull();
    expect(thresholds!.minimumBuild).toBeGreaterThanOrEqual(1);
    expect(thresholds!.minimumBuild).toBeLessThanOrEqual(thresholds!.recommendedBuild);
  });

  it("FR-00005: dev starts with both Android thresholds at 1", () => {
    expect(env.APP_MIN_BUILD_ANDROID).toBe("1");
    expect(env.APP_RECOMMENDED_BUILD_ANDROID).toBe("1");
  });

  it("FR-00005: the dev Android update link is an https address", () => {
    expect(readUpdateUrl(env as unknown as Record<string, unknown>, "android")).toBe(env.APP_UPDATE_URL_ANDROID);
    expect(new URL(env.APP_UPDATE_URL_ANDROID).protocol).toBe("https:");
  });

  it("FR-00005: dev links to the Google Play address for the dev package", () => {
    expect(env.APP_UPDATE_URL_ANDROID).toBe("https://play.google.com/store/apps/details?id=com.dungeondestiny.game.dev");
  });
});

describe("FR-00005: GET /app/version", () => {
  it("FR-00005: a current build is supported and up to date", async () => {
    const { response, body } = await call<AppVersionData>("/app/version", { headers: appHeaders("android", "1") });
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
    expect(body.data).toEqual({
      platform: "android",
      build: 1,
      minimumBuild: 1,
      recommendedBuild: 1,
      supported: true,
      upToDate: true,
      updateUrl: "https://play.google.com/store/apps/details?id=com.dungeondestiny.game.dev",
    });
    expect(body.meta.service).toBe("gateway");
    expect(body.meta.environment).toBe("dev");
  });

  it("FR-00005: a build below the minimum still gets an answer, saying it is not supported", async () => {
    const { response, body } = await call<AppVersionData>("/app/version", { headers: appHeaders("android", "0") });
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.supported).toBe(false);
    expect(body.data.upToDate).toBe(false);
    expect(body.data.updateUrl).toBe("https://play.google.com/store/apps/details?id=com.dungeondestiny.game.dev");
  });

  it("FR-00005: missing headers answer HTTP 400 INVALID_APP_HEADERS", async () => {
    const { response, body } = await call("/app/version");
    expect(response.status).toBe(400);
    expect(body.status).toBe("error");
    expect(body.code).toBe("INVALID_APP_HEADERS");
    expect(body.data).toBeNull();
  });

  it("FR-00005: an unknown platform or a build that is not a whole number answers HTTP 400 INVALID_APP_HEADERS", async () => {
    for (const headers of [appHeaders("ios", "1"), appHeaders("android", "1.5"), appHeaders("android", "abc")]) {
      const { response, body } = await call("/app/version", { headers });
      expect(response.status).toBe(400);
      expect(body.code).toBe("INVALID_APP_HEADERS");
    }
  });

  it("FR-00005: another method on /app/version answers HTTP 405 with Allow: GET", async () => {
    const { response, body } = await call("/app/version", { method: "POST", headers: appHeaders("android", "1") });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
  });
});

describe("FR-00005: build check on other calls", () => {
  it("FR-00005: another call with a build below the minimum answers HTTP 426 APP_UPDATE_REQUIRED", async () => {
    for (const path of ["/health", "/does-not-exist"]) {
      const { response, body } = await call(path, { headers: appHeaders("android", "0") });
      expect(response.status).toBe(426);
      expect(body.status).toBe("error");
      expect(body.code).toBe("APP_UPDATE_REQUIRED");
      expect(body.data).toBeNull();
    }
  });

  it("FR-00005: /health with a supported build answers as before", async () => {
    const { response, body } = await call("/health", { headers: appHeaders("android", "1") });
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("FR-00005: /health without the app headers still answers as before", async () => {
    const { response, body } = await call("/health");
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
  });

  it("FR-00005: another call with invalid app headers answers HTTP 400 INVALID_APP_HEADERS", async () => {
    const { response, body } = await call("/health", { headers: { "X-App-Platform": "android" } });
    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_APP_HEADERS");
  });
});
