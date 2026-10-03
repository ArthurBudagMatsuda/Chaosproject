"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ChaosMark } from "./ui";

const links = [{ href: "#about", label: "The lore" }, { href: "#engine", label: "Chaos Engine" }, { href: "#events", label: "Events" }, { href: "#pool", label: "Chaos Pool" }, { href: "/docs", label: "DOCS" }];

export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="header"><div className="header-inner">
    <a className="brand" href="#" aria-label="CHAOS home"><ChaosMark /><span>CHAOS<span className="brand-dot">$CHAOS</span></span></a>
    <nav aria-label="Main navigation" className="desktop-nav">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    <a href="#participate" className="header-cta">Enter CHAOS <ArrowUpRight size={15} /></a>
    <button className="menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </div>{open && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}<a href="#participate" onClick={() => setOpen(false)}>Enter CHAOS ↗</a></nav>}</header>;
}

export function Footer() {
  return <footer className="footer container"><a className="brand" href="#"><ChaosMark small /><span>CHAOS</span></a><p>A system shaped by unpredictability.</p><span className="mono">© {new Date().getFullYear()} CHAOS · SOLANA MARKET OBSERVATORY</span><a href="#">Back to top ↑</a></footer>;
}
