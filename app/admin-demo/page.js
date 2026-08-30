"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

function localInputValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function format(value) {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

export default function AdminDemoControlPage() {
  const [data, setData] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(60);
  const [startsAt, setStartsAt] = useState(() => localInputValue(new Date(Date.now() + 5 * 60_000)));
  const [endsAt, setEndsAt] = useState(() => localInputValue(new Date(Date.now() + 65 * 60_000)));
  const [controls, setControls] = useState({ allowDiscovery: true, allowDirectProfileView: true, allowInterests: false, allowMessages: false });

  const load = useCallback(async () => {
    setError("");
    try {
      const [summary, list] = await Promise.all([
        api("/api/admin/demo-control"),
        api("/api/admin/demo-profiles"),
      ]);
      setData(summary);
      setProfiles(list.profiles || []);
      setDuration(summary.control?.defaultDurationMinutes || 60);
      setControls({
        allowDiscovery: summary.control?.allowDiscovery !== false,
        allowDirectProfileView: summary.control?.allowDirectProfileView !== false,
        allowInterests: summary.control?.allowInterests === true,
        allowMessages: summary.control?.allowMessages === true,
      });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remaining = useMemo(() => {
    if (!data?.nextEnd) return "No active expiry";
    const ms = new Date(data.nextEnd).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const minutes = Math.ceil(ms / 60_000);
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  }, [data?.nextEnd]);

  async function act(action, body = {}) {
    setBusy(action);
    setNotice("");
    setError("");
    try {
      const result = await api("/api/admin/demo-control", { method: "POST", body: JSON.stringify({ action, ...body }) });
      setData(result);
      setNotice(result.message || "Saved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function profileAct(profileId, action) {
    setBusy(`${action}:${profileId}`);
    setNotice("");
    setError("");
    try {
      const result = await api("/api/admin/demo-profiles", { method: "POST", body: JSON.stringify({ action, profileId, durationMinutes: duration }) });
      setNotice(result.message || "Saved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <small style={styles.eyebrow}>SUPER ADMIN ONLY</small>
          <h1 style={styles.h1}>Demo Control Center</h1>
          <p style={styles.muted}>Timed visibility and emergency controls for synthetic demonstration profiles.</p>
        </div>
        <a href="/" style={styles.link}>Back to Mangalsaath</a>
      </header>

      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.success}>{notice}</div>}

      <section style={styles.metrics}>
        <Metric label="Total demo profiles" value={data?.counts?.total ?? "—"} />
        <Metric label="Visible now" value={data?.counts?.activeNow ?? "—"} />
        <Metric label="Scheduled" value={data?.counts?.scheduled ?? "—"} />
        <Metric label="Hidden" value={data?.counts?.hidden ?? "—"} />
        <Metric label="Next expiry" value={remaining} />
      </section>

      <section style={styles.grid}>
        <Panel title="Immediate control">
          <label style={styles.label}>Duration in minutes
            <input style={styles.input} type="number" min="1" max="10080" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <div style={styles.actions}>
            <button style={styles.primary} disabled={Boolean(busy)} onClick={() => act("enable-now-all", { durationMinutes: duration })}>Enable all now</button>
            <button style={styles.secondary} disabled={Boolean(busy)} onClick={() => act("extend-all", { durationMinutes: duration })}>Extend all</button>
            <button style={styles.warning} disabled={Boolean(busy)} onClick={() => act("disable-all")}>Disable all now</button>
          </div>
          <p style={styles.muted}>Next start: {format(data?.nextStart)}<br />Next end: {format(data?.nextEnd)}</p>
        </Panel>

        <Panel title="Schedule a demo window">
          <label style={styles.label}>Start
            <input style={styles.input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label style={styles.label}>End
            <input style={styles.input} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
          <button style={styles.primary} disabled={Boolean(busy)} onClick={() => act("schedule-all", { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() })}>Schedule all demo profiles</button>
        </Panel>
      </section>

      <section style={styles.grid}>
        <Panel title="Interaction controls">
          <Toggle label="Allow profile discovery" checked={controls.allowDiscovery} set={(value) => setControls({ ...controls, allowDiscovery: value })} />
          <Toggle label="Allow direct profile view" checked={controls.allowDirectProfileView} set={(value) => setControls({ ...controls, allowDirectProfileView: value })} />
          <Toggle label="Allow interests during controlled demo" checked={controls.allowInterests} set={(value) => setControls({ ...controls, allowInterests: value })} />
          <Toggle label="Allow messages during controlled demo" checked={controls.allowMessages} set={(value) => setControls({ ...controls, allowMessages: value })} />
          <button style={styles.primary} disabled={Boolean(busy)} onClick={() => act("save-control", { ...controls, defaultDurationMinutes: duration })}>Save controls</button>
        </Panel>

        <Panel title="Emergency shutdown">
          <p style={styles.muted}>Immediately hides every synthetic demo profile and disables demo interests/messages.</p>
          <button style={styles.danger} disabled={Boolean(busy)} onClick={() => {
            if (window.confirm("Emergency lockdown will immediately hide every demo profile. Continue?")) act("emergency-lockdown");
          }}>Emergency lockdown</button>
        </Panel>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.h2}>Synthetic profile control</h2>
            <p style={styles.muted}>Showing the latest {profiles.length} profiles. Internal demo status is visible only in this Super Admin workspace.</p>
          </div>
          <button style={styles.secondary} onClick={load} disabled={Boolean(busy)}>Refresh</button>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Profile</th><th style={styles.th}>Location</th><th style={styles.th}>Visibility</th><th style={styles.th}>Window</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {profiles.map((profile) => {
                const active = profile.demoVisible && (!profile.demoVisibleFrom || new Date(profile.demoVisibleFrom) <= new Date()) && (!profile.demoVisibleUntil || new Date(profile.demoVisibleUntil) > new Date());
                return <tr key={profile.id}>
                  <td style={styles.td}><b>{profile.name}</b><br /><small>{profile.demoLabel || "Synthetic demo profile"}</small></td>
                  <td style={styles.td}>{profile.city || "—"}, {profile.state || "—"}</td>
                  <td style={styles.td}><span style={active ? styles.badgeOn : styles.badgeOff}>{active ? "Visible" : profile.demoVisible ? "Scheduled" : "Hidden"}</span></td>
                  <td style={styles.td}><small>{format(profile.demoVisibleFrom)}<br />to {format(profile.demoVisibleUntil)}</small></td>
                  <td style={styles.td}>
                    <div style={styles.rowActions}>
                      <button style={styles.smallButton} disabled={Boolean(busy)} onClick={() => profileAct(profile.id, "show")}>Show</button>
                      <button style={styles.smallButton} disabled={Boolean(busy)} onClick={() => profileAct(profile.id, "hide")}>Hide</button>
                      <button style={styles.smallDanger} disabled={Boolean(busy)} onClick={() => {
                        if (window.confirm(`Delete ${profile.name}?`)) profileAct(profile.id, "delete");
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          {!profiles.length && !error && <p style={styles.muted}>No synthetic profiles have been created yet.</p>}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return <article style={styles.metric}><small style={styles.muted}>{label}</small><b style={styles.metricValue}>{value}</b></article>;
}
function Panel({ title, children }) {
  return <section style={styles.panel}><h2 style={styles.h2}>{title}</h2>{children}</section>;
}
function Toggle({ label, checked, set }) {
  return <label style={styles.toggle}><input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} /> <span>{label}</span></label>;
}

const styles = {
  page: { maxWidth: 1220, margin: "0 auto", padding: "38px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24 },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.2 },
  h1: { margin: "7px 0 6px", fontSize: 38 },
  h2: { margin: "0 0 16px", fontSize: 21 },
  muted: { color: "#776a6e", lineHeight: 1.55 },
  link: { color: "#741f39", textDecoration: "none", fontWeight: 700, paddingTop: 8 },
  error: { padding: 14, borderRadius: 10, background: "#fdeaea", color: "#8a1f2d", marginBottom: 16 },
  success: { padding: 14, borderRadius: 10, background: "#e8f6ef", color: "#26704f", marginBottom: 16 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 },
  metric: { background: "#fff", border: "1px solid #eadde1", borderRadius: 14, padding: 18 },
  metricValue: { display: "block", fontSize: 24, color: "#741f39", marginTop: 8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginBottom: 18 },
  panel: { background: "#fff", border: "1px solid #eadde1", borderRadius: 16, padding: 20, marginBottom: 18, boxShadow: "0 10px 30px rgba(77,16,37,.05)" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 },
  label: { display: "grid", gap: 7, fontWeight: 700, marginBottom: 13 },
  input: { width: "100%", padding: 11, border: "1px solid #cebfc4", borderRadius: 9 },
  actions: { display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 12 },
  primary: { border: 0, borderRadius: 9, padding: "11px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #741f39", borderRadius: 9, padding: "10px 13px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  warning: { border: "1px solid #b05b18", borderRadius: 9, padding: "10px 13px", background: "#fff8ee", color: "#8c430e", fontWeight: 700, cursor: "pointer" },
  danger: { border: 0, borderRadius: 9, padding: "12px 15px", background: "#a21d2d", color: "#fff", fontWeight: 800, cursor: "pointer" },
  toggle: { display: "flex", alignItems: "center", gap: 9, margin: "12px 0" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 780 },
  th: { textAlign: "left", padding: 11, borderBottom: "1px solid #eadde1", color: "#776a6e", fontSize: 13 },
  td: { padding: 12, borderBottom: "1px solid #f0e5e8", verticalAlign: "top" },
  badgeOn: { display: "inline-block", padding: "5px 8px", borderRadius: 999, background: "#e8f6ef", color: "#26704f", fontSize: 12, fontWeight: 700 },
  badgeOff: { display: "inline-block", padding: "5px 8px", borderRadius: 999, background: "#f5edf0", color: "#6f5c62", fontSize: 12, fontWeight: 700 },
  rowActions: { display: "flex", flexWrap: "wrap", gap: 6 },
  smallButton: { border: "1px solid #cebfc4", borderRadius: 7, padding: "6px 9px", background: "#fff", cursor: "pointer" },
  smallDanger: { border: "1px solid #d9a8ae", borderRadius: 7, padding: "6px 9px", background: "#fff5f6", color: "#941f2e", cursor: "pointer" },
};
