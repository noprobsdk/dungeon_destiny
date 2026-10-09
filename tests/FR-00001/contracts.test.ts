// FR-00001 tests for the shared contracts package (DD-019).
import { API_STATUSES, ERROR_CODES } from "@dungeon-destiny/contracts";
import type { ApiResponse, ApiStatus, ErrorCode, ResponseMeta } from "@dungeon-destiny/contracts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("FR-00001: packages/contracts", () => {
  it("FR-00001: packages/contracts exports the standard response type", () => {
    expect(API_STATUSES).toEqual(["ok", "error"]);
    expectTypeOf<ApiStatus>().toEqualTypeOf<"ok" | "error">();
    expectTypeOf<ApiResponse<null>>().toEqualTypeOf<{
      status: ApiStatus;
      code: ErrorCode | null;
      message: string;
      data: null;
      meta: ResponseMeta;
    }>();
    expectTypeOf<ResponseMeta>().toEqualTypeOf<{
      requestId: string;
      timestamp: string;
      service: string;
      environment: string;
      version: { id: string; tag: string; createdAt: string };
    }>();
  });

  it("FR-00001: packages/contracts defines the stable error codes used by /health", () => {
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
    expect(ERROR_CODES.METHOD_NOT_ALLOWED).toBe("METHOD_NOT_ALLOWED");
    // FR-00003 adds more codes, so this checks that these two are included.
    expectTypeOf<"NOT_FOUND" | "METHOD_NOT_ALLOWED">().toExtend<ErrorCode>();
  });
});
