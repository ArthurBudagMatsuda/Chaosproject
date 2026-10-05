import { ArrowDown, ArrowUpRight, FlaskConical, Radio } from "lucide-react";
import { EngineCarousel } from "./engine-carousel";
import { Badge, Reveal, SectionLabel } from "./ui";
import { projectConfig } from "@/lib/chaos-data";

export function Engine() {
  return <section className="engine-section" id="engine"><div className="container section"><Reveal><div className="section-heading"><SectionLabel number="02">THE MECHANISM</SectionLabel><Badge>MANUAL / VERIFIED</Badge></div><div className="split-heading"><h2>The Chaos <span className="serif">Engine.</span></h2><p className="body-copy">Market observation and treasury monitoring are separate. When the configured fee wallet reaches its threshold, an operator may transfer funds manually and submit the TXID for verification.</p></div><EngineCarousel /><div className="engine-notice"><FlaskConical size={16} /><p>The website monitors, calculates and verifies. It cannot connect the administrative wallet, sign transactions or move funds. Confirmed distributions are records of transfers already executed manually outside CHAOS.</p><span className="mono">STATUS: NON-CUSTODIAL</span></div></Reveal></div></section>;
}

export function Participate() {
  const tokenAddress = process.env.CHAOS_TOKEN_CA?.trim();
  return <section className="participate section" id="participate"><Reveal className="container"><div className="participate-eyebrow mono"><Radio size={16} /> THE NEXT DISTURBANCE STARTS WITH YOU.</div><h2>YOU ARE NOT WATCHING<br />THE SYSTEM.<br /><span>YOU ARE PART OF IT.</span></h2><p>Follow the signal. Observe the evolution.<br />See what a small change can set in motion.</p><div className="participate-actions">{projectConfig.socialUrl ? <a className="button primary" href={projectConfig.socialUrl} target="_blank" rel="noopener noreferrer">Follow CHAOS <ArrowUpRight size={17} /></a> : <span className="social-placeholder contract-address"><Radio size={16} /><span>{tokenAddress ? `CA: ${tokenAddress}` : "CONTRACT ADDRESS UNAVAILABLE"}</span></span>}{projectConfig.communityUrl && <a className="button secondary" href={projectConfig.communityUrl} target="_blank" rel="noopener noreferrer">Join the community <ArrowUpRight size={16} /></a>}<a className="text-button" href="#engine">Explore the system <ArrowDown size={15} /></a></div><p className="prototype-note mono">MARKET OBSERVATION · NON-CUSTODIAL MONITORING · VERIFIED RECORDS</p></Reveal></section>;
}
