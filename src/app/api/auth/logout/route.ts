import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (token) {
    await invalidateSession(token);
  }

  const res = NextResponse.json({ success: true, data: null });

  for (const name of ["auth_token", "auth_user", "auth_role"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return res;
}
