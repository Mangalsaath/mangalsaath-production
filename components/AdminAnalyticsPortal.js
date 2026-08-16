"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

async function adminAnalyticsApi(path, options = {}) {
  const token = localStorage.getItem("ms_token") || "";
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
  if (!response.ok) throw new Error(data.error || "Unable to load analytics.");
  return data;
}

export default function AdminAnalyticsPortal() {
  const [target, setTarget] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const locate = () => {
      const next = document.querySelector(".fullAdminConsole .adminMain");
      setTarget((current) => (current === next ? current : next));
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!target) {
      setData(null);
      return;
    }
    let cancelled = false;
    adminAnalyticsApi("/api/admin/analytics")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target || !data) return null;

  async function excludeCurrentIp() {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminAnalyticsApi("/api/admin/analytics", {
        method: "POST",
        body: JSON.stringify({ action: "exclude-current-ip" }),
      });
      setData((current) => ({ ...current, currentIpExcluded: true }));
      setMessage(result.message || "Current IP excluded.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <section className="privateCommunityAnalytics" aria-label="Private Mangalsaath community analytics">
      <div className="privateCommunityAnalyticsHeader">
        <div>
          <small>SUPER ADMIN ONLY</small>
          <h3>Live Mangalsaath Community</h3>
          <p>Private community and visitor statistics. These numbers are not shown on the public website.</p>
        </div>
        <div className="analyticsIpControl">
          <span className={data.currentIpExcluded ? "excluded" : "included"}>
            {data.currentIpExcluded ? "✓ Current IP excluded" : "Current IP is being counted"}
          </span>
          {!data.currentIpExcluded && (
            <button disabled={busy} onClick={excludeCurrentIp}>
              {busy ? "Excluding…" : "Exclude Current IP"}
            </button>
          )}
        </div>
      </div>

      <div className="privateCommunityAnalyticsGrid">
        <article>
          <small>Unique Visitors</small>
          <b>{Number(data.uniqueVisitors || 0).toLocaleString("en-IN")}</b>
        </article>
        <article>
          <small>Registered Members</small>
          <b>{Number(data.registeredMembers || 0).toLocaleString("en-IN")}</b>
        </article>
        <article>
          <small>Verified Profiles</small>
          <b>{Number(data.verifiedProfiles || 0).toLocaleString("en-IN")}</b>
        </article>
        <article>
          <small>Premium Members</small>
          <b>{Number(data.premiumMembers || 0).toLocaleString("en-IN")}</b>
        </article>
        <article>
          <small>Visitors Today</small>
          <b>{Number(data.todayVisitors || 0).toLocaleString("en-IN")}</b>
        </article>
      </div>
      {message && <p className="analyticsIpMessage">{message}</p>}
    </section>,
    target,
  );
}
