"use client";

import { useCallback, useEffect, useState } from "react";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminDemoVisibilityQuickControl() {
  const [show, setShow] = useState(false);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!show) return;
    try {
      const response = await fetch("/api/admin/demo-visibility", {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to read AI profile visibility.");
      setState(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [show]);

  useEffect(() => {
    const detect = () => setShow(Boolean(document.querySelector(".fullAdminConsole")));
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/demo-visibility", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action, durationMinutes: 60 }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update AI profile visibility.");
      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  const enabled = Number(state?.visibleNow || 0) > 0;
  return (
    <aside style={styles.card} aria-label="AI profile visibility control">
      <div style={styles.head}>
        <div>
          <small style={styles.eyebrow}>SUPER ADMIN QUICK CONTROL</small>
          <strong style={styles.title}>AI Profiles Visibility</strong>
        </div>
        <span style={enabled ? styles.on : styles.off}>{enabled ? "ON" : "OFF"}</span>
      </div>
      <p style={styles.meta}>
        Visible now: <b>{state?.visibleNow ?? "—"}</b> / {state?.total ?? "—"}
        {state?.expiresAt ? ` · until ${new Date(state.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </p>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.actions}>
        <button style={styles.enable} disabled={busy} onClick={() => act("enable")}>
          {busy ? "Please wait…" : "Enable for 60 min"}
        </button>
        <button style={styles.disable} disabled={busy} onClick={() => act("disable")}>
          Disable now
        </button>
      </div>
    </aside>
  );
}

const styles = {
  card: { position: "fixed", right: 18, bottom: 18, zIndex: 9999, width: 310, background: "#fff", border: "1px solid #eadde1", borderRadius: 14, boxShadow: "0 16px 45px rgba(77,16,37,.18)", padding: 16, fontFamily: "Arial, sans-serif", color: "#291d21" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eyebrow: { display: "block", fontSize: 10, letterSpacing: 1, color: "#741f39", fontWeight: 800, marginBottom: 4 },
  title: { display: "block", fontSize: 17 },
  on: { padding: "5px 9px", borderRadius: 999, background: "#e8f6ef", color: "#26704f", fontWeight: 800, fontSize: 12 },
  off: { padding: "5px 9px", borderRadius: 999, background: "#f5edf0", color: "#6f5c62", fontWeight: 800, fontSize: 12 },
  meta: { margin: "11px 0", fontSize: 13, color: "#6f6266", lineHeight: 1.45 },
  error: { margin: "8px 0", padding: 8, borderRadius: 8, background: "#fdeaea", color: "#8a1f2d", fontSize: 12 },
  actions: { display: "flex", gap: 8 },
  enable: { flex: 1, border: 0, borderRadius: 8, padding: "10px 9px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  disable: { flex: 1, border: "1px solid #a21d2d", borderRadius: 8, padding: "10px 9px", background: "#fff5f6", color: "#941f2e", fontWeight: 700, cursor: "pointer" },
};
