// FR-00005 tests for invalid thresholds: the minimum supported build is above
// the recommended build (test values only). The gateway must not guess.
import { describe, expect, it } from "vitest";
import { appHeaders, call } from "../helpers";

describe("FR-00005: invalid thresholds", () => {
  it("FR-00005: /app/version answers HTTP 500 SERVER_MISCONFIGURED", async () => {
    const { response, body } = await call("/app/version", { headers: appHeaders("android", "5") });
    expect(response.status).toBe(500);
    expect(body.status).toBe("error");
    expect(body.code).toBe("SERVER_MISCONFIGURED");
    expect(body.data).toBeNull();
  });

  it("FR-00005: a call with app headers answers HTTP 500 SERVER_MISCONFIGURED", async () => {
    const { response, body } = await call("/health", { headers: appHeaders("android", "5") });
    expect(response.status).toBe(500);
    expect(body.code).toBe("SERVER_MISCONFIGURED");
  });

  it("FR-00005: /health without the app headers still answers", async () => {
    const { response } = await call("/health");
    expect(response.status).toBe(200);
  });
});
