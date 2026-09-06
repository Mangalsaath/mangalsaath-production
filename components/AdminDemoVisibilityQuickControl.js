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

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function AdminDemoVisibilityQuickControl() {
  const [mount, setMount] = useState(null);
  const [state, setState] = useState(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [mangalId, setMangalId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  useEffect(() => {
    function attach() {
      const adminMain = document.querySelector(".fullAdminConsole .adminMain");
      if (!adminMain) {
        setMount((current) => (current ? null : current));
        return;
      }
      let node = document.getElementById("admin-ai-profile-control-mount");
      if (!node) {
        node = document.createElement("div");
        node.id = "admin-ai-profile-control-mount";
        node.style.width = "100%";
        node.style.marginBottom = "18px";
        node.style.position = "relative";
        node.style.zIndex = "2";
        node.style.pointerEvents = "auto";
        adminMain.prepend(node);
      }
      setMount((current) => (current === node ? current : node));
    }

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!mount) return;
    try {
      const response = await fetchWithTimeout("/api/admin/demo-visibility", {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to read AI profile visibility.");
      setState(data);
    } catch (err) {
      setError(err?.name === "AbortError" ? "Admin control request timed out. Please try again." : err.message);
    }
  }, [mount]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action) {
    if (visibilityBusy) return;
    setVisibilityBusy(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetchWithTimeout("/api/admin/demo-visibility", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update AI profile control.");
      setState(data);
      setStatusMessage(action === "enable" ? "AI profiles enabled." : "AI profiles disabled.");
    } catch (err) {
      setError(err?.name === "AbortError" ? "AI visibility request timed out. Please try again." : err.message);
    } finally {
      setVisibilityBusy(false);
    }
  }

  async function findProfile(event) {
    event?.preventDefault?.();
    if (searchBusy) return;

    const id = mangalId.trim().toUpperCase();
    if (!/^MANGAL\d{4,}$/.test(id) || Number(id.slice(6)) < 1001) {
      setError("Enter a valid Mangal ID, for example MANGAL1001 or MANGAL10001.");
      setStatusMessage("");
      setLookupResult(null);
      return;
    }

    setSearchBusy(true);
    setError("");
    setStatusMessage(`Searching ${id}…`);
    setLookupResult(null);

    try {
      const response = await fetchWithTimeout(`/api/admin/profiles/by-mangal-id?id=${encodeURIComponent(id)}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to find profile.");

      if (data.type === "ai") {
        setStatusMessage(`AI profile ${data.mangalsaathId} found. Opening editor…`);
        window.location.assign(`/admin-demo/profiles?mangalId=${encodeURIComponent(data.mangalsaathId)}`);
        return;
      }

      setLookupResult(data);
      setStatusMessage(`Real profile ${data.mangalsaathId} found.`);
    } catch (err) {
      setStatusMessage("");
      setError(err?.name === "AbortError" ? "Profile lookup timed out. Please try again." : err.message);
    } finally {
      setSearchBusy(false);
    }
  }

  if (!mount) return null;

  const enabled = state?.enabled === true;
  const panel = (
    <section style={styles.panel} aria-label="Super Admin profile control">
      <small style={styles.eyebrow}>SUPER ADMIN CONTROL PANEL</small>
      <strong style={styles.title}>Profile Control & Workspace</strong>
      <p style={styles.subtitle}>Search any profile by Mangal ID. AI profiles open in the AI editor; real profiles are shown here.</p>

      <div style={styles.profileGrid}>
        <article style={styles.actualCard}>
          <span style={styles.actualBadge}>ACTUAL</span>
          <strong style={styles.sectionTitle}>Actual Member Profiles</strong>
          <b style={styles.count}>{state?.actualTotal ?? "—"}</b>
          <small style={styles.help}>Real registered profiles.</small>
        </article>
        <article style={enabled ? styles.aiCardOn : styles.aiCardOff}>
          <div style={styles.aiHeader}>
            <span style={styles.aiBadge}>AI</span>
            <span style={enabled ? styles.on : styles.off}>{enabled ? "ENABLED" : "DISABLED"}</span>
          </div>
          <strong style={styles.sectionTitle}>AI / Synthetic Profiles</strong>
          {enabled ? <b style={styles.count}>{state?.aiVisibleNow ?? 0}</b> : <small style={styles.disabledText}>AI profile count is hidden while visibility is disabled.</small>}
        </article>
      </div>

      <form style={styles.lookupPanel} onSubmit={findProfile}>
        <div>
          <strong style={styles.sectionTitle}>Search Profile by Mangal ID</strong>
          <small style={styles.help}>AI: MANGAL1001 onward · Real: MANGAL10001 onward</small>
        </div>
        <div style={styles.lookupActions}>
          <input
            name="mangalId"
            style={styles.lookupInput}
            value={mangalId}
            maxLength={20}
            placeholder="MANGAL1001 / MANGAL10001"
            onChange={(e) => setMangalId(e.target.value.toUpperCase())}
          />
          <button type="submit" style={styles.lookupButton} disabled={searchBusy}>
            {searchBusy ? "Searching…" : "Find Profile"}
          </button>
        </div>
      </form>

      {statusMessage && <p style={styles.status}>{statusMessage}</p>}
      {error && <p style={styles.error}>{error}</p>}

      {lookupResult?.type === "real" && (
        <div style={styles.resultCard}>
          <span style={styles.realBadge}>REAL PROFILE</span>
          <strong style={styles.resultName}>{lookupResult.profile?.name || `${lookupResult.user?.firstName || ""} ${lookupResult.user?.lastName || ""}`.trim()}</strong>
          <b style={styles.resultId}>{lookupResult.mangalsaathId}</b>
          <div style={styles.resultGrid}>
            <span><b>Status:</b> {lookupResult.user?.status || "—"}</span>
            <span><b>Approval:</b> {lookupResult.user?.approvalStatus || "—"}</span>
            <span><b>City:</b> {lookupResult.profile?.city || "—"}</span>
            <span><b>Profession:</b> {lookupResult.profile?.profession || "—"}</span>
            <span><b>Email:</b> {lookupResult.user?.email || "—"}</span>
            <span><b>Mobile:</b> {lookupResult.user?.mobile || "—"}</span>
          </div>
        </div>
      )}

      <div style={styles.workspacePanel}>
        <div>
          <strong style={styles.sectionTitle}>AI Profile Workspace</strong>
          <small style={styles.help}>These links remain usable even while a search request is running.</small>
        </div>
        <div style={styles.workspaceActions}>
          <a style={styles.workspaceLinkPrimary} href="/admin-demo/profiles">Edit AI Profiles</a>
          <a style={styles.workspaceLink} href="/admin-demo/gallery">AI Gallery</a>
          <a style={styles.workspaceLink} href="/admin-demo/gallery/batch">Batch Rollout</a>
        </div>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.enable} disabled={visibilityBusy || enabled} onClick={() => act("enable")}>
          {visibilityBusy ? "Please wait…" : "Enable AI Profiles"}
        </button>
        <button type="button" style={styles.disable} disabled={visibilityBusy || !enabled} onClick={() => act("disable")}>
          {visibilityBusy ? "Please wait…" : "Disable AI Profiles"}
        </button>
      </div>
    </section>
  );

  return createPortal(panel, mount);
}

const styles = {
  panel: { width: "100%", boxSizing: "border-box", position: "relative", zIndex: 2, pointerEvents: "auto", background: "#fff", border: "1px solid #eadde1", borderRadius: 16, boxShadow: "0 8px 24px rgba(77,16,37,.08)", padding: 18, fontFamily: "Arial, sans-serif", color: "#291d21" },
  eyebrow: { display: "block", fontSize: 10, letterSpacing: 1, color: "#741f39", fontWeight: 800, marginBottom: 4 },
  title: { display: "block", fontSize: 20 },
  subtitle: { margin: "5px 0 14px", color: "#71656a", fontSize: 13 },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 },
  actualCard: { border: "1px solid #d8e3ec", borderRadius: 12, padding: 14, background: "#f8fbfd", minHeight: 130 },
  aiCardOn: { border: "1px solid #b9dfcb", borderRadius: 12, padding: 14, background: "#f3fbf7", minHeight: 130 },
  aiCardOff: { border: "1px solid #eadde1", borderRadius: 12, padding: 14, background: "#faf7f8", minHeight: 130 },
  actualBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#e7f0f7", color: "#315d79", fontSize: 10, fontWeight: 800, marginBottom: 7 },
  aiBadge: { display: "inline-block", padding: "3px 7px", borderRadius: 999, background: "#f1e4ea", color: "#741f39", fontSize: 10, fontWeight: 800 },
  realBadge: { display: "inline-block", padding: "4px 8px", borderRadius: 999, background: "#e7f0f7", color: "#315d79", fontSize: 10, fontWeight: 800, marginBottom: 8 },
  aiHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 7 },
  sectionTitle: { display: "block", fontSize: 14, lineHeight: 1.3, marginBottom: 8 },
  count: { display: "block", fontSize: 30, lineHeight: 1, margin: "8px 0" },
  help: { display: "block", color: "#71656a", fontSize: 12, lineHeight: 1.4 },
  disabledText: { display: "block", color: "#7b6b71", fontSize: 12, lineHeight: 1.4, marginTop: 18 },
  on: { padding: "4px 7px", borderRadius: 999, background: "#e1f5e9", color: "#26704f", fontWeight: 800, fontSize: 9 },
  off: { padding: "4px 7px", borderRadius: 999, background: "#efe8eb", color: "#6f5c62", fontWeight: 800, fontSize: 9 },
  lookupPanel: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, padding: 14, border: "1px solid #dcc8cf", borderRadius: 12, background: "#fff8fb" },
  lookupActions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  lookupInput: { minWidth: 240, border: "1px solid #bda8af", borderRadius: 8, padding: "10px 11px", fontSize: 14 },
  lookupButton: { border: 0, borderRadius: 8, padding: "10px 13px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  status: { margin: "10px 0 0", padding: 10, borderRadius: 8, background: "#eef6ff", color: "#315d79", fontSize: 12 },
  error: { margin: "10px 0 0", padding: 10, borderRadius: 8, background: "#fdeaea", color: "#8a1f2d", fontSize: 12 },
  resultCard: { marginTop: 12, padding: 14, border: "1px solid #cbdbe5", borderRadius: 12, background: "#f8fbfd" },
  resultName: { display: "block", fontSize: 17, marginBottom: 3 },
  resultId: { display: "block", color: "#741f39", fontSize: 15, marginBottom: 10 },
  resultGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 10, fontSize: 13 },
  workspacePanel: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, padding: 14, border: "1px solid #eadde1", borderRadius: 12, background: "#fcfafb" },
  workspaceActions: { display: "flex", flexWrap: "wrap", gap: 8 },
  workspaceLinkPrimary: { display: "inline-block", textDecoration: "none", border: 0, borderRadius: 8, padding: "10px 13px", background: "#741f39", color: "#fff", fontWeight: 700 },
  workspaceLink: { display: "inline-block", textDecoration: "none", border: "1px solid #741f39", borderRadius: 8, padding: "9px 12px", background: "#fff", color: "#741f39", fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  enable: { minWidth: 180, border: 0, borderRadius: 8, padding: "11px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  disable: { minWidth: 180, border: "1px solid #a21d2d", borderRadius: 8, padding: "11px 14px", background: "#fff5f6", color: "#941f2e", fontWeight: 700, cursor: "pointer" },
};
