"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DistributionRecord, FinancialSnapshot } from "@/lib/financial-types";

const sol = (value: number | null) => value === null ? "--" : `${value.toLocaleString("en-US", { maximumFractionDigits: 9 })} SOL`;
const time = (value: string | null) => value ? new Date(value).toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC" : "--";

export function AdminDashboard({ initialSnapshot, initialDistributions }: { initialSnapshot: FinancialSnapshot; initialDistributions: DistributionRecord[] }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [distributions, setDistributions] = useState(initialDistributions);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/distributions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: form.get("amount"), destinationProject: form.get("destinationProject"), destinationToken: form.get("destinationToken"), destinationWallet: form.get("destinationWallet"), txid: form.get("txid") }) });
    const body = await response.json() as { error?: string; distribution?: DistributionRecord; snapshot?: FinancialSnapshot };
    if (!response.ok || !body.distribution || !body.snapshot) setMessage({ ok: false, text: body.error || "Verification failed" });
    else { setSnapshot(body.snapshot); setDistributions(current => [body.distribution!, ...current]); setMessage({ ok: true, text: "Transaction verified and distribution registered." }); formElement.reset(); }
    setPending(false);
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
  const t = snapshot.threshold;
  return <main className="admin-shell"><header className="admin-topbar"><div><span className="mono">CHAOS / FINANCIAL MONITOR</span><strong>ADMIN RECORD</strong></div><button onClick={logout} title="Sign out"><LogOut size={16} />SIGN OUT</button></header><div className="admin-content">
    <section className="admin-heading"><div><span className="mono">READ + MONITORING + VERIFICATION</span><h1>Distribution console</h1><p>Register only transactions already sent manually from the configured fee wallet.</p></div><div className={`admin-status status-${snapshot.status}`}>{snapshot.status.replaceAll("_", " ").toUpperCase()}</div></section>
    <section className="admin-metrics" aria-label="Financial status">
      <article><span>CHAOS TOKEN CA</span><strong title={snapshot.token.address ?? undefined}>{snapshot.token.address ?? "NOT CONFIGURED"}</strong></article>
      <article><span>FEE WALLET CA</span><strong title={snapshot.feeWallet.address ?? undefined}>{snapshot.feeWallet.address ?? "NOT CONFIGURED"}</strong></article>
      <article><span>CURRENT BALANCE</span><strong>{sol(snapshot.feeWallet.balanceSol)}</strong></article>
      <article><span>CURRENT THRESHOLD</span><strong>{sol(t.currentThreshold)}</strong></article>
      <article><span>PROGRESS</span><strong>{t.progress.toFixed(2)}%</strong></article>
      <article><span>AVAILABLE FOR DISTRIBUTION</span><strong>{sol(t.availableForDistribution)}</strong></article>
      <article><span>NEXT THRESHOLD</span><strong>{sol(t.nextThreshold)}</strong></article>
      <article><span>LAST DISTRIBUTION</span><strong>{snapshot.lastDistribution ? time(snapshot.lastDistribution.verifiedAt) : "--"}</strong></article>
      <article><span>LAST TX</span><strong title={snapshot.lastDistribution?.txid}>{snapshot.lastDistribution?.txid ?? "--"}</strong></article>
      <article><span>LAST UPDATE</span><strong>{time(snapshot.lastUpdate)}</strong></article>
    </section>
    <section className="admin-grid"><div className="admin-panel"><div className="admin-panel-title"><ShieldCheck size={18} /><div><span className="mono">ON-CHAIN VERIFICATION</span><h2>Register distribution</h2></div></div><form className="admin-form" onSubmit={register}><label>AMOUNT (SOL)<input name="amount" type="number" min="0.000000001" step="0.000000001" required /></label><label>DESTINATION PROJECT<input name="destinationProject" maxLength={120} required /></label><label>DESTINATION TOKEN CA <small>OPTIONAL METADATA</small><input name="destinationToken" /></label><label>DESTINATION WALLET<input name="destinationWallet" required /></label><label>TXID<input name="txid" required /></label><button disabled={pending || !snapshot.feeWallet.configured} type="submit"><RefreshCw size={15} className={pending ? "spin" : ""} />{pending ? "VERIFYING ON SOLANA" : "VERIFY & REGISTER"}</button>{message && <p className={message.ok ? "admin-success" : "admin-form-error"} role="status">{message.text}</p>}</form></div>
      <div className="admin-panel"><div className="admin-panel-title"><div><span className="mono">IMMUTABLE AFTER CONFIRMATION</span><h2>Distribution history</h2></div></div>{distributions.length ? <div className="admin-history">{distributions.map(item => <article key={item.id}><div><strong>{item.destinationProject}</strong><span>{sol(item.amount)} / {item.status.toUpperCase()}</span></div><time>{time(item.verifiedAt)}</time><a href={`https://solscan.io/tx/${item.txid}`} target="_blank" rel="noopener noreferrer" title="Open transaction"><ExternalLink size={15} /></a></article>)}</div> : <p className="admin-empty">No verified distributions registered.</p>}</div>
    </section>
    <section className="admin-panel"><div className="admin-panel-title"><div><span className="mono">INDEX RECORDS REMAIN SEPARATE</span><h2>Verified financial events</h2></div></div>{snapshot.verifiedEvents.length ? <div className="admin-event-list">{snapshot.verifiedEvents.map(event => <article key={event.id}><span className="admin-real-badge">REAL / VERIFIED</span><strong>{event.type}</strong><p>{event.description}</p><time>{time(event.timestamp)}</time>{event.txid && <a href={`https://solscan.io/tx/${event.txid}`} target="_blank" rel="noopener noreferrer">TX <ExternalLink size={12} /></a>}</article>)}</div> : <p className="admin-empty">No verified financial events.</p>}</section>
  </div></main>;
}
