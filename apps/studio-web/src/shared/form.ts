// FR-00004: form validation with the same Zod schemas studio-api uses, so a
// form shows the same rules before anything is sent. Errors are keyed by the
// field they belong to, which Mantine highlights with the message under it.
import type { ZodType } from "zod";
import { ApiError } from "./api-client";

export type FieldErrors = Record<string, string>;

type Issue = { path?: unknown; message?: unknown };

function toFieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = Array.isArray(issue.path) ? issue.path : [];
    const field = typeof path[0] === "string" ? path[0] : null;
    if (field && typeof issue.message === "string" && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

// For useForm's validate option: the schema's errors for these values.
export function validateWith<T>(schema: ZodType<unknown, T>) {
  return (values: T): FieldErrors => {
    const result = schema.safeParse(values);
    return result.success ? {} : toFieldErrors(result.error.issues);
  };
}

// The field errors studio-api returned with VALIDATION_FAILED, if any.
export function serverFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_FAILED" || !Array.isArray(error.details)) return {};
  return toFieldErrors(error.details as Issue[]);
}
