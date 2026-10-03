import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminAuthConfig, requestHasSameOrigin, verifyAdminSession } from "@/server/financial/auth";
import { getFinancialConfig } from "@/server/financial/config";
import { SolanaProvider } from "@/server/financial/solana-provider";
import { FinancialStore } from "@/server/financial/store";
import { confirmDistribution, DistributionVerificationError, validateDistributionSubmission, verifyDistributionTransaction } from "@/server/financial/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value, getAdminAuthConfig());
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = getFinancialConfig();
  const state = await new FinancialStore(config).read(config);
  return NextResponse.json({ snapshot: state.snapshot, distributions: state.distributions }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requestHasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const config = getFinancialConfig();
  try {
    const submission = validateDistributionSubmission(await request.json());
    const store = new FinancialStore(config);
    const existing = await store.read(config);
    if (existing.distributions.some(item => item.txid === submission.txid && item.status === "confirmed")) throw new DistributionVerificationError("This TXID is already registered", "DUPLICATE_TXID");
    const verification = await verifyDistributionTransaction(submission, new SolanaProvider(config), config, request.signal);
    const verifiedAt = new Date().toISOString();
    const state = await store.update(config, current => confirmDistribution(current, submission, verification.timestamp, verifiedAt, config));
    return NextResponse.json({ distribution: state.distributions[0], event: state.snapshot.verifiedEvents[0], snapshot: state.snapshot }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DistributionVerificationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "DUPLICATE_TXID" ? 409 : 422 });
    return NextResponse.json({ error: "Solana verification is currently unavailable", code: "RPC_UNAVAILABLE" }, { status: 503 });
  }
}
