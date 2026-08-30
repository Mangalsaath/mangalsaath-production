"use client";

import { useEffect, useMemo, useState } from "react";

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

function labelUser(user) {
  if (!user) return "Unknown member";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id;
}

function format(value) {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

export default function DemoInboxPage() {
  const [data, setData] = useState({ profiles: [], interests: [], messages: [], control: {} });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState({});

  async function load() {
    try {
      setMessage("");
      const next = await api("/api/admin/demo-inbox");
      setData(next);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const demoByUserId = useMemo(
    () => new Map((data.profiles || []).map((profile) => [profile.userId, profile])),
    [data.profiles],
  );

  const incomingInterests = useMemo(
    () =>
      (data.interests || []).filter(
        (interest) => demoByUserId.has(interest.toUserId),
      ),
    [data.interests, demoByUserId],
  );

  const incomingMessages = useMemo(
    () =>
      (data.messages || []).filter(
        (item) => demoByUserId.has(item.toUserId),
      ),
    [data.messages, demoByUserId],
  );

  async function interestResponse(interestId, response) {
    setBusy(`${response}:${interestId}`);
    try {
      const result = await api("/api/admin/demo-inbox", {
        method: "POST",
        body: JSON.stringify({ action: "interest-response", interestId, response }),
      });
      setMessage(result.message || "Interest updated.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function reply(item) {
    const text = String(replyText[item.id] || "").trim();
    if (!text) return;
    setBusy(`reply:${item.id}`);
    try {
      const result = await api("/api/admin/demo-inbox/reply", {
        method: "POST",
        body: JSON.stringify({ messageId: item.id, text }),
      });
      setReplyText({ ...replyText, [item.id]: "" });
      setMessage(result.message || "Reply sent.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <small style={styles.eyebrow}>SUPER ADMIN ONLY</small>
          <h1 style={styles.h1}>Assisted Demo Inbox</h1>
          <p style={styles.muted}>
            Review and respond to interests and messages involving synthetic demo profiles.
          </p>
        </div>
        <div style={styles.links}>
          <a href="/admin-demo" style={styles.link}>Demo Control</a>
          <a href="/admin-demo/access" style={styles.link}>Viewer Access</a>
        </div>
      </header>

      <section style={styles.metrics}>
        <Metric label="Demo profiles" value={data.profiles?.length || 0} />
        <Metric label="Incoming interests" value={incomingInterests.length} />
        <Metric label="Incoming messages" value={incomingMessages.length} />
        <Metric label="Demo status" value={data.control?.enabled ? "ON" : "OFF"} />
      </section>

      {message && <div style={styles.notice}>{message}</div>}

      <section style={styles.grid}>
        <Panel title="Incoming interests">
          <div style={styles.rows}>
            {incomingInterests.map((interest) => {
              const demoProfile = demoByUserId.get(interest.toUserId);
              return (
                <article key={interest.id} style={styles.row}>
                  <div>
                    <b>{labelUser(interest.sender)}</b>
                    <p style={styles.muted}>
                      to {demoProfile?.name || "Demo profile"} · {format(interest.createdAt)}
                    </p>
                    <span style={styles.badge}>{interest.status}</span>
                  </div>
                  {interest.status === "Pending" && (
                    <div style={styles.actions}>
                      <button
                        style={styles.primary}
                        disabled={Boolean(busy)}
                        onClick={() => interestResponse(interest.id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        style={styles.secondary}
                        disabled={Boolean(busy)}
                        onClick={() => interestResponse(interest.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {!incomingInterests.length && <Empty text="No demo-profile interests yet." />}
          </div>
        </Panel>

        <Panel title="Incoming messages">
          <div style={styles.rows}>
            {incomingMessages.map((item) => {
              const demoProfile = demoByUserId.get(item.toUserId);
              return (
                <article key={item.id} style={styles.rowStack}>
                  <div>
                    <b>{labelUser(item.sender)}</b>
                    <p style={styles.muted}>
                      to {demoProfile?.name || "Demo profile"} · {format(item.createdAt)}
                    </p>
                    <p style={styles.messageText}>{item.text}</p>
                  </div>
                  <textarea
                    style={styles.textarea}
                    rows={2}
                    maxLength={1000}
                    placeholder={`Reply as ${demoProfile?.name || "demo profile"}`}
                    value={replyText[item.id] || ""}
                    onChange={(event) =>
                      setReplyText({ ...replyText, [item.id]: event.target.value })
                    }
                  />
                  <button
                    style={styles.primary}
                    disabled={Boolean(busy) || !data.control?.allowMessages}
                    onClick={() => reply(item)}
                  >
                    Reply as demo profile
                  </button>
                </article>
              );
            })}
            {!incomingMessages.length && <Empty text="No demo-profile messages yet." />}
          </div>
        </Panel>
      </section>

      {!data.control?.allowMessages && (
        <div style={styles.warning}>
          Demo messaging is currently disabled. Enable it in Demo Control before replying.
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return <article style={styles.metric}><small style={styles.muted}>{label}</small><b style={styles.metricValue}>{value}</b></article>;
}
function Panel({ title, children }) {
  return <section style={styles.panel}><h2 style={styles.h2}>{title}</h2>{children}</section>;
}
function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const styles = {
  page: { maxWidth: 1220, margin: "0 auto", padding: "38px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24 },
  links: { display: "flex", gap: 12, flexWrap: "wrap" },
  link: { color: "#741f39", textDecoration: "none", fontWeight: 700 },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.2 },
  h1: { margin: "7px 0 6px", fontSize: 38 },
  h2: { margin: "0 0 16px", fontSize: 21 },
  muted: { color: "#776a6e", lineHeight: 1.5, margin: "5px 0" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 },
  metric: { background: "#fff", border: "1px solid #eadde1", borderRadius: 14, padding: 18 },
  metricValue: { display: "block", color: "#741f39", fontSize: 24, marginTop: 8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 18 },
  panel: { background: "#fff", border: "1px solid #eadde1", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(77,16,37,.05)" },
  rows: { display: "grid", gap: 12 },
  row: { display: "flex", justifyContent: "space-between", gap: 14, padding: 14, border: "1px solid #f0e5e8", borderRadius: 12 },
  rowStack: { display: "grid", gap: 10, padding: 14, border: "1px solid #f0e5e8", borderRadius: 12 },
  actions: { display: "flex", gap: 7, alignItems: "center" },
  primary: { border: 0, borderRadius: 8, padding: "9px 12px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #741f39", borderRadius: 8, padding: "8px 11px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  badge: { display: "inline-block", padding: "4px 7px", borderRadius: 999, background: "#f5edf0", color: "#741f39", fontSize: 12, fontWeight: 700 },
  textarea: { width: "100%", padding: 10, border: "1px solid #cebfc4", borderRadius: 9, resize: "vertical" },
  messageText: { lineHeight: 1.55, margin: "10px 0 0" },
  notice: { padding: 13, borderRadius: 10, background: "#f5edf0", color: "#741f39", marginBottom: 16 },
  warning: { padding: 13, borderRadius: 10, background: "#fff3df", color: "#865511", marginTop: 18 },
  empty: { padding: 24, border: "1px dashed #eadde1", borderRadius: 10, color: "#776a6e", textAlign: "center" },
};
