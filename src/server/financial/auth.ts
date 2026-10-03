import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "chaos_admin_session";

export interface AdminAuthConfig { username: string; password: string | null; sessionSecret: string | null; configured: boolean }

export function getAdminAuthConfig(env: NodeJS.ProcessEnv = process.env): AdminAuthConfig {
  const username = env.CHAOS_ADMIN_USERNAME?.trim() || "admin";
  const password = env.CHAOS_ADMIN_PASSWORD || null;
  const sessionSecret = env.CHAOS_ADMIN_SESSION_SECRET || null;
  return { username, password, sessionSecret, configured: password !== null && sessionSecret !== null && sessionSecret.length >= 32 };
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminCredentials(username: string, password: string, config: AdminAuthConfig) {
  return config.configured && equal(username, config.username) && equal(password, config.password!);
}

export function createAdminSession(config: AdminAuthConfig, now = Date.now()) {
  if (!config.configured) throw new Error("Admin authentication is not configured");
  const payload = Buffer.from(JSON.stringify({ username: config.username, expires: now + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", config.sessionSecret!).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token: string | undefined, config: AdminAuthConfig, now = Date.now()) {
  if (!token || !config.configured) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", config.sessionSecret!).update(payload).digest("base64url");
  if (!equal(signature, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username?: unknown; expires?: unknown };
    return value.username === config.username && typeof value.expires === "number" && value.expires > now;
  } catch { return false; }
}

export function requestHasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const requestUrl = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || requestUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.replace(":", "");
    return source.host === host && source.protocol === `${protocol}:`;
  } catch { return false; }
}
