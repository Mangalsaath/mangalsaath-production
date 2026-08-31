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

  const enabled = state?.enabled === true;
  return (
    <aside style={styles.card} aria-label="Super Admin profile visibility control">
      <div style={styles.head}>
        <div>
          <small style={styles.eyebrow}>SUPER ADMIN CONTROL PANEL</small>
          <strong style={styles.title}>Profile Visibility Control</strong>
        </div>
      </div>

      <div style={styles.profileGrid}>
        <section style={styles.actualCard}>
          <span style={styles.actualBadge}>ACTUAL</span>
          <strong style={styles.sectionTitle}>Actual Member Profiles</strong>
          <b style={styles.count}>{state?.actualTotal ?? "—"}</b>
          <small style={styles.help}>Real registered member profiles. AI visibility control does not affect these.</small>
        </section>

        <section style={enabled ? styles.aiCardOn : styles.aiCardOff}>
          <div style={styles.aiHeader}>
            <span style={styles.aiBadge}>AI</span>
            <span style={enabled ? styles.on : styles.off}>{enabled ? "ENABLED" : "DISABLED"}</span>
          </div>
          <strong style={styles.sectionTitle}>AI / Synthetic Profiles</strong>
          {enabled ? (
            <>
              <b style={styles.count}>{state?.aiVisibleNow ?? 0}</b>
              <small style={styles.help}>
                Currently visible AI profiles
                {state?.expiresAt ? ` · auto-disable ${new Date(state.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </small>
            </>
          ) : (
            <small style={styles.disabledText}>Count hidden while AI profiles are disabled.</small>
          )}
        </section>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.actions}>
        <button style={styles.enable} disabled={busy || enabled} onClick={() => act("enable")}>
          {busy ? "Please wait…" : "Enable AI Profiles"}
        </button>
        <button style={styles.disable} disabled={busy || !enabled} onClick={() => act("disable")}>
          Disable AI Profiles
        </button>
      </div>
    </aside>
  );
}

const styles = {
  card: { position: "fixed", right: 18, bottom: 18, zIndex: 9999, width: 370, background: "#fff", border: "1px solid #eadde1", borderRadius: 16, boxShadow: "0 16px 45px rgba(77,16,37,.18)", padding: 16, fontFamily: "Arial, sans-serif", color: "#291d21" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  eyebrow: { display: "block", fontSize: 10, letterSpacing: 1, color: "#741f39", fontWeight: 800, marginBottom: 4 },
  title: { display: "block", fontSize: 18 },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  actualCard: { border: "1px solid #d8e3ec", borderRadius: 12, padding: 12, background: "#f8fbfd", minHeight: 145 },
  aiCardOn: { border: "1px solid #b9dfcb", borderRadius: 12, padding: 12, background: "#f3fbf7", minHeight: 145 },
  aiCardOff: { border: "1px solid #eadde1", borderRadius: 12, padding: 12, background: "#faf7f8", minHeight: 145 },
  actualBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#e7f0f7", color: "#315d79", fontSize: 10, fontWeight: 800, marginBottom: 7 },
  aiBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#f1e4ea", color: "#741f39", fontSize: 10, fontWeight: 800 },
  aiHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 7 },
  sectionTitle: { display: "block", fontSize: 13, lineHeight: 1.3, marginBottom: 8 },
  count: { display: "block", fontSize: 28, lineHeight: 1, margin: "7px 0" },
  help: { display: "block", color: "#71656a", fontSize: 11, lineHeight: 1.35 },
  disabledText: { display: "block", color: "#7b6b71", fontSize: 12, lineHeight: 1.4, marginTop: 16 },
  on: { padding: "4px 7px", borderRadius: 999, background: "#e1f5e9", color: "#26704f", fontWeight: 800, fontSize: 9 },
  off: { padding: "4px 7px", borderRadius: 999, background: "#efe8eb", color: "#6f5c62", fontWeight: 800, fontSize: 9 },
  error: { margin: "10px 0", padding: 8, borderRadius: 8, background: "#fdeaea", color: "#8a1f2d", fontSize: 12 },
  actions: { display: "flex", gap: 8, marginTop: 12 },
  enable: { flex: 1, border: 0, borderRadius: 8, padding: "10px 9px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  disable: { flex: 1, border: "1px solid #a21d2d", borderRadius: 8, padding: "10px 9px", background: "#fff5f6", color: "#941f2e", fontWeight: 700, cursor: "pointer" },
};
