"use client";

import { useMemo, useState } from "react";

async function api(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

const example = JSON.stringify([
  {
    profileId: "demo_profile_0001",
    primaryIndex: 0,
    photos: [
      { url: "https://cdn.example.com/demo_profile_0001/portrait.webp", label: "Portrait" },
      { url: "https://cdn.example.com/demo_profile_0001/formal.webp", label: "Formal" },
      { url: "https://cdn.example.com/demo_profile_0001/traditional.webp", label: "Traditional" },
      { url: "https://cdn.example.com/demo_profile_0001/lifestyle.webp", label: "Lifestyle" },
      { url: "https://cdn.example.com/demo_profile_0001/close-up.webp", label: "Close-up" }
    ]
  }
], null, 2);

export default function AiGalleryBatchPage() {
  const [manifest, setManifest] = useState(example);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState([]);
  const [validatedPayload, setValidatedPayload] = useState("");

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(manifest);
      return { value, error: "" };
    } catch (err) {
      return { value: null, error: err.message };
    }
  }, [manifest]);

  async function run(mode) {
    setError("");
    setNotice("");
    if (parsed.error || !Array.isArray(parsed.value)) {
      setError(parsed.error ? `Invalid JSON: ${parsed.error}` : "Manifest must be a JSON array.");
      return;
    }
    if (mode === "apply" && validatedPayload !== manifest) {
      setError("Manifest changed after validation. Validate again before applying.");
      return;
    }

    setBusy(true);
    try {
      const result = await api("/api/admin/demo-profiles/gallery/batch", {
        method: "POST",
        body: JSON.stringify({ mode, profiles: parsed.value }),
      });
      setNotice(result.message || (mode === "validate" ? "Batch validated." : "Batch applied."));
      const rows = result.preview || result.results || [];
      setPreview(rows);
      if (mode === "validate") setValidatedPayload(manifest);
      if (mode === "apply") setValidatedPayload("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <small style={s.eyebrow}>SUPER ADMIN ONLY</small>
          <h1 style={s.h1}>AI Gallery Batch Rollout</h1>
          <p style={s.muted}>Safely replace galleries for up to 10 AI profiles per batch. Validate first, then apply sequentially.</p>
        </div>
        <a href="/admin-demo/gallery" style={s.link}>Single Profile Gallery</a>
      </header>

      {error && <div style={s.error}>{error}</div>}
      {notice && <div style={s.success}>{notice}</div>}

      <section style={s.panel}>
        <h2 style={s.h2}>Batch manifest</h2>
        <p style={s.muted}>Rules: 1–10 AI profiles per batch, 1–5 HTTPS images per profile, primaryIndex starts at 0. Applying replaces only the gallery and preserves profile visibility.</p>
        <textarea
          style={s.textarea}
          value={manifest}
          onChange={(event) => { setManifest(event.target.value); setValidatedPayload(""); setPreview([]); }}
          spellCheck={false}
        />
        <div style={s.actions}>
          <button style={s.primary} disabled={busy} onClick={() => run("validate")}>Validate Batch</button>
          <button
            style={s.apply}
            disabled={busy || validatedPayload !== manifest}
            onClick={() => { if (window.confirm("Apply this validated gallery batch? Existing gallery photos for these AI profiles will be replaced.")) run("apply"); }}
          >
            Apply Validated Batch
          </button>
          <button style={s.secondary} disabled={busy} onClick={() => { setManifest(example); setValidatedPayload(""); setPreview([]); setError(""); setNotice(""); }}>Reset Example</button>
        </div>
      </section>

      {preview.length > 0 && (
        <section style={s.panel}>
          <h2 style={s.h2}>Batch preview / result</h2>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Profile</th>
                  <th style={s.th}>Profile ID</th>
                  <th style={s.th}>Photos</th>
                  <th style={s.th}>Primary</th>
                  <th style={s.th}>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.profileId}>
                    <td style={s.td}>{row.name || "—"}</td>
                    <td style={s.td}><code>{row.profileId}</code></td>
                    <td style={s.td}>{row.photoCount}</td>
                    <td style={s.td}>{row.primaryIndex !== undefined ? `Index ${row.primaryIndex}` : (row.primaryPhoto || "—")}</td>
                    <td style={s.td}>{row.visibility || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

const s = {
  page: { maxWidth: 1180, margin: "0 auto", padding: "34px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22, flexWrap: "wrap" },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.2 },
  h1: { margin: "7px 0 6px", fontSize: 36 }, h2: { margin: "0 0 8px" },
  muted: { color: "#776a6e", lineHeight: 1.5 }, link: { color: "#741f39", textDecoration: "none", fontWeight: 700 },
  panel: { background: "#fff", border: "1px solid #eadde1", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 10px 30px rgba(77,16,37,.05)" },
  textarea: { width: "100%", minHeight: 420, padding: 14, border: "1px solid #cebfc4", borderRadius: 10, boxSizing: "border-box", fontFamily: "Consolas, monospace", fontSize: 13, lineHeight: 1.45, resize: "vertical" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  primary: { border: 0, borderRadius: 9, padding: "10px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  apply: { border: 0, borderRadius: 9, padding: "10px 14px", background: "#26704f", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #741f39", borderRadius: 9, padding: "9px 13px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  error: { padding: 14, borderRadius: 10, background: "#fdeaea", color: "#8a1f2d", marginBottom: 16 },
  success: { padding: 14, borderRadius: 10, background: "#e8f6ef", color: "#26704f", marginBottom: 16 },
  tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "2px solid #eadde1", fontSize: 13 },
  td: { padding: "10px 8px", borderBottom: "1px solid #f0e6e9", verticalAlign: "top" },
};
