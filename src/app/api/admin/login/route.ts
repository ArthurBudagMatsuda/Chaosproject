import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, getAdminAuthConfig, requestHasSameOrigin, verifyAdminCredentials } from "@/server/financial/auth";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (!requestHasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const config = getAdminAuthConfig();
  if (!config.configured) return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = attempts.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 15 * 60_000 } : current;
  if (bucket.count >= 5) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) } });
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyAdminCredentials(username, password, config)) {
    bucket.count++;
    attempts.set(key, bucket);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  attempts.delete(key);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(config, now), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60 });
  return response;
}
