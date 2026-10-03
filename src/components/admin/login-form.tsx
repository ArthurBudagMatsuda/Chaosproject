"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setError(body.error || "Authentication failed"); setPending(false); return; }
    router.replace("/admin"); router.refresh();
  }
  return <main className="admin-login"><div className="admin-login-panel"><LockKeyhole size={28} /><span className="mono">CHAOS / RESTRICTED OPERATOR ACCESS</span><h1>Admin verification console</h1><p>This surface records manually executed distributions after independent Solana RPC verification. It cannot send or sign transactions.</p>
    {!configured ? <div className="admin-alert">NOT CONFIGURED<br /><small>Set CHAOS_ADMIN_PASSWORD and a CHAOS_ADMIN_SESSION_SECRET of at least 32 characters.</small></div> : <form onSubmit={submit}><label>USERNAME<input name="username" autoComplete="username" required /></label><label>PASSWORD<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={pending} type="submit"><LockKeyhole size={15} />{pending ? "VERIFYING" : "SIGN IN"}</button>{error && <p className="admin-form-error" role="alert">{error}</p>}</form>}
  </div></main>;
}
