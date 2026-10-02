import { marketResponse } from "@/server/market/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return marketResponse("chaos"); }
