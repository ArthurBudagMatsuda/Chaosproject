import { marketResponse } from "@/server/market/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET() { return marketResponse("events"); }
