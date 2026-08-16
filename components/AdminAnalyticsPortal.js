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

const number = (value) => Number(value || 0).toLocaleString("en-IN");
const rate = (value) => `${Number(value || 0).toFixed(1)}%`;

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
          <h3>Growth & Membership Funnel</h3>
          <p>Private acquisition, profile-completion and membership conversion statistics.</p>
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

      {data.foundingOffer && (
        <div className="analyticsIpMessage">
          <b>First {number(data.foundingOffer.limit)} founding-member offer:</b>{" "}
          {data.foundingOffer.active
            ? `${number(data.foundingOffer.remaining)} place(s) remaining.`
            : "Founding allocation completed; normal paid conversion is now active."}
        </div>
      )}

      <div className="privateCommunityAnalyticsGrid">
        <article><small>Unique Visitors</small><b>{number(data.uniqueVisitors)}</b></article>
        <article><small>Total Visits</small><b>{number(data.totalVisits)}</b></article>
        <article><small>Registered Members</small><b>{number(data.registeredMembers)}</b></article>
        <article><small>Completed Profiles</small><b>{number(data.completedProfiles)}</b></article>
        <article><small>Verified Profiles</small><b>{number(data.verifiedProfiles)}</b></article>
        <article><small>Interests Sent</small><b>{number(data.interestsSent)}</b></article>
        <article><small>Premium Members</small><b>{number(data.premiumMembers)}</b></article>
        <article><small>Paid Members</small><b>{number(data.paidMembers)}</b></article>
        <article><small>Visitors Today</small><b>{number(data.todayVisitors)}</b></article>
      </div>

      <div className="privateCommunityAnalyticsGrid">
        <article><small>Visitor → Registration</small><b>{rate(data.conversion?.visitorToRegistration)}</b></article>
        <article><small>Registration → Profile</small><b>{rate(data.conversion?.registrationToProfile)}</b></article>
        <article><small>Profile → Verified</small><b>{rate(data.conversion?.profileToVerified)}</b></article>
        <article><small>Registration → Premium</small><b>{rate(data.conversion?.registrationToPremium)}</b></article>
        <article><small>Registration → Paid</small><b>{rate(data.conversion?.registrationToPaid)}</b></article>
      </div>
      {message && <p className="analyticsIpMessage">{message}</p>}
    </section>,
    target,
  );
}
