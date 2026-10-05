import { getFinancialConfig } from "./config.ts";
import { publicFinancialSnapshot } from "./store.ts";
import { readCurrentFinancialState } from "./state-service.ts";

export async function readFinancialData(now = Date.now()) {
  const config = getFinancialConfig();
  const state = await readCurrentFinancialState(config);
  const snapshot = publicFinancialSnapshot(state.snapshot, config, now);
  return {
    ...snapshot,
    distributions: state.distributions.filter(item => item.status === "confirmed"),
  };
}

export async function financialResponse() {
  try {
    return Response.json(await readFinancialData(), {
      headers: {
        "Cache-Control": "public, max-age=5, must-revalidate",
        "X-Data-Source": "solana-rpc",
        "X-Custody": "false",
      },
    });
  } catch {
    return Response.json({ error: "Financial snapshot unavailable", status: "unavailable", custody: false }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } });
  }
}
