"use client";

import { useEffect, useState } from "react";

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

export default function DemoAccessAdminPage() {
  const [control, setControl] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState(120);
  const [accessRequired, setAccessRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api("/api/admin/demo-control");
      setControl(data.control || {});
      setSessionMinutes(data.control?.viewerSessionMinutes || 120);
      setAccessRequired(data.control?.viewerAccessRequired !== false);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        action: "save-control",
        viewerAccessRequired: accessRequired,
        viewerSessionMinutes: Number(sessionMinutes) || 120,
      };
      if (accessCode.trim()) payload.accessCode = accessCode.trim();
      const data = await api("/api/admin/demo-control", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setControl(data.control || control);
      setAccessCode("");
      setMessage(data.message || "Demo access settings saved.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.head}>
          <div>
            <small style={styles.eyebrow}>SUPER ADMIN ONLY</small>
            <h1 style={styles.h1}>Demo Viewer Access</h1>
          </div>
          <a href="/admin-demo" style={styles.link}>Back to Demo Control Center</a>
        </div>

        <p style={styles.muted}>
          Configure the passcode used by an authorized client browser before synthetic demo profiles can be viewed on the live website.
        </p>

        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={accessRequired}
            onChange={(event) => setAccessRequired(event.target.checked)}
          />
          Require client demo access code
        </label>

        <label style={styles.label}>
          New access code
          <input
            style={styles.input}
            type="password"
            minLength={6}
            maxLength={64}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder={control?.accessCodeHash ? "Code already configured — enter only to replace" : "6–64 characters"}
          />
        </label>

        <label style={styles.label}>
          Client session duration (minutes)
          <input
            style={styles.input}
            type="number"
            min="1"
            max="1440"
            value={sessionMinutes}
            onChange={(event) => setSessionMinutes(event.target.value)}
          />
        </label>

        <div style={styles.status}>
          Access code: <b>{control?.accessCodeHash ? "Configured" : "Not configured"}</b><br />
          Demo mode: <b>{control?.enabled ? "Enabled" : "Disabled"}</b>
        </div>

        <button style={styles.primary} disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save viewer access controls"}
        </button>

        <p style={styles.muted}>
          Client entry page: <b>/demo-access</b>. Emergency Lockdown or Disable All revokes existing demo viewer sessions.
        </p>

        {message && <div style={styles.message}>{message}</div>}
      </section>
    </main>
  );
}

const styles = {
  page: { maxWidth: 880, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  card: { background: "#fff", border: "1px solid #eadde1", borderRadius: 18, padding: 26, boxShadow: "0 14px 40px rgba(77,16,37,.07)" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.1 },
  h1: { margin: "8px 0", fontSize: 34 },
  link: { color: "#741f39", textDecoration: "none", fontWeight: 700 },
  muted: { color: "#776a6e", lineHeight: 1.6 },
  toggle: { display: "flex", gap: 9, alignItems: "center", margin: "22px 0", fontWeight: 700 },
  label: { display: "grid", gap: 8, margin: "16px 0", fontWeight: 700 },
  input: { width: "100%", padding: 12, border: "1px solid #cebfc4", borderRadius: 10 },
  status: { padding: 14, borderRadius: 10, background: "#fff8ee", margin: "18px 0", lineHeight: 1.6 },
  primary: { border: 0, borderRadius: 10, padding: "12px 16px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: 14 },
  message: { marginTop: 16, padding: 12, borderRadius: 9, background: "#f5edf0", color: "#741f39" },
};
