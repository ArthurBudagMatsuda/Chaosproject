"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ExternalLink, ShieldCheck, WalletCards } from "lucide-react";
import { readFinancialSnapshot, type PublicFinancialData } from "@/lib/financial-client";
import { Badge, Reveal, SectionLabel } from "./ui";

const sol = (value: number | null) => value === null ? "--" : `${value.toLocaleString("en-US", { maximumFractionDigits: 9 })} SOL`;
const time = (value: string | null) => value ? new Date(value).toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC" : "--";
const address = (value: string | null) => value ? `${value.slice(0, 6)}...${value.slice(-6)}` : "NOT CONFIGURED";

export function FinancialStatusPanel() {
  const [data, setData] = useState<PublicFinancialData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { setData(await readFinancialSnapshot(controller.signal)); setError(false); }
      catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) timer = setTimeout(poll, 30_000); }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const threshold = data?.threshold;
  const last = data?.lastDistribution;
  return <section className="treasury-section" id="treasury"><div className="container section"><Reveal>
    <div className="section-heading"><SectionLabel number="03">VERIFIED ON-CHAIN STATE</SectionLabel><Badge>SOLANA RPC / READ ONLY</Badge></div>
    <div className="split-heading"><h2>Chaos <span className="serif">Treasury.</span></h2><p className="body-copy">The backend observes the configured fee wallet. Transfers remain manual and are shown only after their TXID is verified on Solana.</p></div>
    {error && <p className="market-error" role="status">Financial monitor unavailable. Previously displayed observations may be outdated.</p>}
    <div className="treasury-health mono" role="status"><span>MONITOR: {error ? "UNAVAILABLE" : data?.status.replaceAll("_", " ").toUpperCase() ?? "LOADING"}</span><span>LAST UPDATE: {time(data?.lastUpdate ?? null)}</span><span>CUSTODY: NONE</span></div>
    <div className="treasury-grid">
      <article><WalletCards size={19} /><span className="mono">FEE WALLET</span><strong>{sol(data?.feeWallet.balanceSol ?? null)}</strong><small title={data?.feeWallet.address ?? undefined}>{address(data?.feeWallet.address ?? null)}</small></article>
      <article><CircleDollarSign size={19} /><span className="mono">CURRENT THRESHOLD</span><strong>{threshold ? sol(threshold.currentThreshold) : "--"}</strong><small>{threshold ? `LEVEL ${threshold.level + 1}` : "AWAITING STATE"}</small></article>
      <article><ShieldCheck size={19} /><span className="mono">AVAILABLE FOR DISTRIBUTION</span><strong>{threshold ? sol(threshold.availableForDistribution) : "--"}</strong><small>{threshold?.distributionAvailable ? "MANUAL ACTION AVAILABLE" : threshold ? `${sol(threshold.remaining)} REMAINING` : "AWAITING STATE"}</small></article>
    </div>
    <div className="treasury-progress" aria-label={`Treasury threshold progress ${threshold?.progress ?? 0}%`}><div style={{ width: `${threshold?.progress ?? 0}%` }} /><span className="mono">{threshold?.progress.toFixed(1) ?? "0.0"}%</span></div>
    <div className="treasury-last"><div><span className="mono">LAST VERIFIED DISTRIBUTION</span><strong>{last ? `${sol(last.amount)} / ${last.destinationProject}` : "NO VERIFIED DISTRIBUTIONS"}</strong><small>{last ? time(last.verifiedAt) : "A manual transfer must be verified by TXID before appearing here."}</small></div>{last && <a href={`https://solscan.io/tx/${last.txid}`} target="_blank" rel="noopener noreferrer" aria-label="Open verified transaction on Solscan"><ExternalLink size={17} /></a>}</div>
    <p className="demo-note mono">MONITORING AND VERIFICATION ONLY. THE WEBSITE HOLDS NO PRIVATE KEY, CANNOT SIGN TRANSACTIONS AND CANNOT MOVE FUNDS.</p>
  </Reveal></div></section>;
}
