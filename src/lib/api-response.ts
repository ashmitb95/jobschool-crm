import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiCreated<T>(data: T) {
  return apiSuccess(data, 201);
}

export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: { message, ...(code && { code }) } },
    { status }
  );
}

export function apiUnauthorized(message = "Unauthorized") {
  return apiError(message, 401, "UNAUTHORIZED");
}

export function apiForbidden(message = "Forbidden") {
  return apiError(message, 403, "FORBIDDEN");
}

export function apiNotFound(message = "Not found") {
  return apiError(message, 404, "NOT_FOUND");
}

export function apiValidationError(error: ZodError) {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details,
      },
    },
    { status: 400 }
  );
}
