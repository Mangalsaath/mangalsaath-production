"use client";

import { useEffect, useState } from "react";

export default function DemoAccessPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/demo-access", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    setStatus(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to start demo access.");
      setStatus({ ...status, authorized: true });
      setMessage(data.message || "Demo access granted.");
      setCode("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function endAccess() {
    setBusy(true);
    try {
      await fetch("/api/demo-access", { method: "DELETE" });
      await load();
      setMessage("Demo access ended.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <small style={styles.eyebrow}>MANGALSAATH CONTROLLED DEMO</small>
        <h1 style={styles.heading}>Client Demo Access</h1>
        <p style={styles.text}>
          This access page is used only during a Super Admin-authorized live demonstration window.
        </p>

        {status?.authorized ? (
          <>
            <div style={styles.success}>Demo access is active on this browser.</div>
            <a href="/" style={styles.primary}>Open Mangalsaath</a>
            <button style={styles.secondary} disabled={busy} onClick={endAccess}>End demo access</button>
          </>
        ) : status?.enabled === false ? (
          <div style={styles.notice}>The controlled demo is currently disabled by Super Admin.</div>
        ) : (
          <form onSubmit={submit}>
            <label style={styles.label}>
              Demo access code
              <input
                style={styles.input}
                type="password"
                autoComplete="one-time-code"
                value={code}
                minLength={6}
                maxLength={64}
                required
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button style={styles.primary} disabled={busy} type="submit">
              {busy ? "Checking…" : "Enter controlled demo"}
            </button>
          </form>
        )}

        {message && <p style={styles.message}>{message}</p>}
        <a href="/" style={styles.back}>Back to Mangalsaath</a>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#fffaf5", fontFamily: "Arial, sans-serif", color: "#291d21" },
  card: { width: "100%", maxWidth: 480, padding: 32, background: "#fff", border: "1px solid #eadde1", borderRadius: 20, boxShadow: "0 18px 55px rgba(77,16,37,.11)" },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.1 },
  heading: { margin: "10px 0", fontSize: 32 },
  text: { color: "#776a6e", lineHeight: 1.6 },
  label: { display: "grid", gap: 8, margin: "24px 0 14px", fontWeight: 700 },
  input: { width: "100%", padding: 12, border: "1px solid #cebfc4", borderRadius: 10 },
  primary: { display: "inline-block", border: 0, borderRadius: 10, padding: "12px 16px", background: "#741f39", color: "#fff", textDecoration: "none", fontWeight: 700, cursor: "pointer", marginRight: 8 },
  secondary: { border: "1px solid #741f39", borderRadius: 10, padding: "11px 15px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  success: { padding: 13, borderRadius: 10, background: "#e8f6ef", color: "#26704f", margin: "18px 0" },
  notice: { padding: 13, borderRadius: 10, background: "#fff3df", color: "#865511", margin: "18px 0" },
  message: { marginTop: 16, color: "#741f39" },
  back: { display: "block", marginTop: 24, color: "#776a6e", textDecoration: "none" },
};
