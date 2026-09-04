"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminDemoVisibilityQuickControl() {
  const [mount, setMount] = useState(null);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mangalId, setMangalId] = useState("");

  useEffect(() => {
    function attach() {
      const adminMain = document.querySelector(".fullAdminConsole .adminMain");
      if (!adminMain) {
        setMount(null);
        return;
      }

      let node = document.getElementById("admin-ai-profile-control-mount");
      if (!node) {
        node = document.createElement("div");
        node.id = "admin-ai-profile-control-mount";
        node.style.width = "100%";
        node.style.marginBottom = "18px";
        adminMain.prepend(node);
      }
      setMount(node);
    }

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!mount) return;
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
  }, [mount]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action, extra = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/demo-visibility", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action, ...extra }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update AI profile control.");
      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function findAndEdit() {
    const id = mangalId.trim();
    if (!/^Mangal[A-Z0-9]{6}$/i.test(id)) {
      setError("Enter Mangal ID in Mangalxxxxxx format.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/demo-profiles/by-mangal-id?id=${encodeURIComponent(id)}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to find AI profile.");
      window.location.href = `/admin-demo/profiles?mangalId=${encodeURIComponent(data.profile.mangalsaathId)}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!mount) return null;

  const enabled = state?.enabled === true;
  const panel = (
    <section style={styles.panel} aria-label="Super Admin AI profile visibility control">
      <div style={styles.head}>
        <div>
          <small style={styles.eyebrow}>SUPER ADMIN CONTROL PANEL</small>
          <strong style={styles.title}>AI Profile Control & Workspace</strong>
          <p style={styles.subtitle}>Control AI profile availability and amend protected AI profile details directly from Admin Console.</p>
        </div>
      </div>

      <div style={styles.profileGrid}>
        <article style={styles.actualCard}>
          <span style={styles.actualBadge}>ACTUAL</span>
          <strong style={styles.sectionTitle}>Actual Member Profiles</strong>
          <b style={styles.count}>{state?.actualTotal ?? "—"}</b>
          <small style={styles.help}>Real registered profiles. AI controls never affect these profiles.</small>
        </article>

        <article style={enabled ? styles.aiCardOn : styles.aiCardOff}>
          <div style={styles.aiHeader}>
            <span style={styles.aiBadge}>AI</span>
            <span style={enabled ? styles.on : styles.off}>{enabled ? "ENABLED" : "DISABLED"}</span>
          </div>
          <strong style={styles.sectionTitle}>AI / Synthetic Profiles</strong>
          {enabled ? (
            <>
              <b style={styles.count}>{state?.aiVisibleNow ?? 0}</b>
              <small style={styles.help}>Visible until the Super Admin manually disables them.</small>
            </>
          ) : (
            <small style={styles.disabledText}>AI profile count is hidden while visibility is disabled.</small>
          )}
        </article>
      </div>

      <div style={styles.lookupPanel}>
        <div>
          <strong style={styles.sectionTitle}>Find & Edit AI Profile by Mangal ID</strong>
          <small style={styles.help}>Enter the exact permanent profile ID, for example MangalA1B2C3. The ID itself cannot be edited.</small>
        </div>
        <div style={styles.lookupActions}>
          <input
            style={styles.lookupInput}
            value={mangalId}
            maxLength={12}
            placeholder="Mangalxxxxxx"
            onChange={(e) => setMangalId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") findAndEdit(); }}
          />
          <button style={styles.lookupButton} disabled={busy} onClick={findAndEdit}>Find & Edit</button>
        </div>
      </div>

      <div style={styles.workspacePanel}>
        <div>
          <strong style={styles.sectionTitle}>AI Profile Workspace</strong>
          <small style={styles.help}>Browse all AI profiles, edit details, manage gallery photos and run controlled gallery batches.</small>
        </div>
        <div style={styles.workspaceActions}>
          <a style={styles.workspaceLinkPrimary} href="/admin-demo/profiles">Edit AI Profiles</a>
          <a style={styles.workspaceLink} href="/admin-demo/gallery">AI Gallery</a>
          <a style={styles.workspaceLink} href="/admin-demo/gallery/batch">Batch Rollout</a>
        </div>
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
    </section>
  );

  return createPortal(panel, mount);
}

const styles = {
  panel: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #eadde1", borderRadius: 16, boxShadow: "0 8px 24px rgba(77,16,37,.08)", padding: 18, fontFamily: "Arial, sans-serif", color: "#291d21" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  eyebrow: { display: "block", fontSize: 10, letterSpacing: 1, color: "#741f39", fontWeight: 800, marginBottom: 4 },
  title: { display: "block", fontSize: 20 },
  subtitle: { margin: "5px 0 0", color: "#71656a", fontSize: 13 },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 },
  actualCard: { border: "1px solid #d8e3ec", borderRadius: 12, padding: 14, background: "#f8fbfd", minHeight: 145 },
  aiCardOn: { border: "1px solid #b9dfcb", borderRadius: 12, padding: 14, background: "#f3fbf7", minHeight: 145 },
  aiCardOff: { border: "1px solid #eadde1", borderRadius: 12, padding: 14, background: "#faf7f8", minHeight: 145 },
  actualBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#e7f0f7", color: "#315d79", fontSize: 10, fontWeight: 800, marginBottom: 7 },
  aiBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#f1e4ea", color: "#741f39", fontSize: 10, fontWeight: 800 },
  aiHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 7 },
  sectionTitle: { display: "block", fontSize: 14, lineHeight: 1.3, marginBottom: 8 },
  count: { display: "block", fontSize: 30, lineHeight: 1, margin: "8px 0" },
  help: { display: "block", color: "#71656a", fontSize: 12, lineHeight: 1.4 },
  disabledText: { display: "block", color: "#7b6b71", fontSize: 12, lineHeight: 1.4, marginTop: 18 },
  on: { padding: "4px 7px", borderRadius: 999, background: "#e1f5e9", color: "#26704f", fontWeight: 800, fontSize: 9 },
  off: { padding: "4px 7px", borderRadius: 999, background: "#efe8eb", color: "#6f5c62", fontWeight: 800, fontSize: 9 },
  lookupPanel: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, padding: 14, border: "1px solid #dcc8cf", borderRadius: 12, background: "#fff8fb" },
  lookupActions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  lookupInput: { minWidth: 210, border: "1px solid #bda8af", borderRadius: 8, padding: "10px 11px", fontSize: 14 },
  lookupButton: { border: 0, borderRadius: 8, padding: "10px 13px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  workspacePanel: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, padding: 14, border: "1px solid #eadde1", borderRadius: 12, background: "#fcfafb" },
  workspaceActions: { display: "flex", flexWrap: "wrap", gap: 8 },
  workspaceLinkPrimary: { display: "inline-block", textDecoration: "none", border: 0, borderRadius: 8, padding: "10px 13px", background: "#741f39", color: "#fff", fontWeight: 700 },
  workspaceLink: { display: "inline-block", textDecoration: "none", border: "1px solid #741f39", borderRadius: 8, padding: "9px 12px", background: "#fff", color: "#741f39", fontWeight: 700 },
  error: { margin: "12px 0 0", padding: 10, borderRadius: 8, background: "#fdeaea", color: "#8a1f2d", fontSize: 12 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  enable: { minWidth: 180, border: 0, borderRadius: 8, padding: "11px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  disable: { minWidth: 180, border: "1px solid #a21d2d", borderRadius: 8, padding: "11px 14px", background: "#fff5f6", color: "#941f2e", fontWeight: 700, cursor: "pointer" },
};
