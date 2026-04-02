import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/logout", "/api/contact"];
const WEBHOOK_PREFIX = "/api/webhooks/";
const STATIC_PREFIXES = ["/_next/", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow webhooks (external callbacks)
  if (pathname.startsWith(WEBHOOK_PREFIX)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("auth_role")?.value;

  if (!token) {
    // API routes get 401, pages get redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Route gating by role (lightweight, from cookie)
  // Super-admin can ONLY access /manage/* and /api/manage/*
  if (role === "super_admin") {
    const allowed =
      pathname.startsWith("/manage") ||
      pathname.startsWith("/api/manage") ||
      pathname.startsWith("/api/auth");
    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { message: "Super admin cannot access tenant resources", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/manage", request.url));
    }
  }

  // Non-super-admin cannot access /manage/*
  if (role && role !== "super_admin") {
    if (pathname.startsWith("/manage") || pathname.startsWith("/api/manage")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { message: "Forbidden", code: "FORBIDDEN" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/pipeline", request.url));
    }
  }

  // Logged-in users visiting /login get redirected
  if (pathname === "/login") {
    const redirect = role === "super_admin" ? "/manage" : "/pipeline";
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
