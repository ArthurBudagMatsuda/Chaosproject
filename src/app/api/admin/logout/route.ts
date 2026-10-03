import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, requestHasSameOrigin } from "@/server/financial/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestHasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
