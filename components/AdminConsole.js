"use client";

import { useEffect, useMemo, useState } from "react";

const TABS = [
  ["dashboard", "Dashboard"],
  ["members", "Members"],
  ["verification", "Verification"],
  ["payments", "Payments"],
  ["plans", "Plans"],
  ["promotions", "Coupons & Offers"],
  ["reports", "Reports"],
  ["settings", "Settings"],
  ["audit", "Audit Logs"],
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) => (value ? new Date(value).toLocaleString("en-IN") : "—");
const status = (value) => (
  <span
    className={`adminBadge ${["approved", "active", "paid", "success", "resolved"].includes(String(value).toLowerCase()) ? "ok" : ["rejected", "suspended", "dismissed", "failed"].includes(String(value).toLowerCase()) ? "bad" : "wait"}`}
  >
    {value || "pending"}
  </span>
);

export default function AdminConsole({
  admin,
  adminSettings,
  busy,
  onMemberAction,
  onPaymentReview,
  onReportReview,
  onSavePlan,
  onSaveCoupon,
  onDeleteCoupon,
  onSaveOffer,
  onDeleteOffer,
  onSaveSettings,
  onUploadQr,
  onRemoveQr,
}) {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [reportNotes, setReportNotes] = useState({});
  const [planDraft, setPlanDraft] = useState(null);
  const [couponDraft, setCouponDraft] = useState(null);
  const [offerDraft, setOfferDraft] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(
    adminSettings?.settings || {},
  );

  useEffect(() => {
    setSettingsDraft(adminSettings?.settings || {});
  }, [adminSettings]);

  useEffect(() => {
    if (!selected?.id) return;
    const refreshed = (admin.users || []).find(
      (member) => member.id === selected.id,
    );
    setSelected(refreshed || null);
  }, [admin.users, selected?.id]);

  const members = useMemo(
    () =>
      (admin.users || []).filter((m) => {
        if (m.role !== "member") return false;
        const q = search.trim().toLowerCase();
        const hay =
          `${m.id} ${m.firstName} ${m.lastName} ${m.email} ${m.mobile} ${m.profile?.city} ${m.profile?.religion} ${m.profile?.caste}`.toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (filter === "pending") return m.approvalStatus === "pending";
        if (filter === "approved") return m.approvalStatus === "approved";
        if (filter === "suspended") return m.status === "suspended";
        if (filter === "rejected") return m.approvalStatus === "rejected";
        return true;
      }),
    [admin.users, search, filter],
  );

  const settings = adminSettings?.settings || {};
  const plans = adminSettings?.plans || admin.plans || [];
  const coupons = adminSettings?.coupons || [];
  const offers = adminSettings?.homepageOffers || [];
  const audits = adminSettings?.auditLogs || admin.activities || [];

  function choose(next) {
    setTab(next);
    setSelected(null);
    setNote("");
  }
  function editPlan(plan = {}) {
    setPlanDraft({
      active: true,
      durationDays: 30,
      displayOrder: 0,
      features: {},
      ...plan,
    });
  }
  function editCoupon(coupon = {}) {
    setCouponDraft({
      active: true,
      discountType: "percentage",
      discountValue: 10,
      maxUses: 0,
      usesPerUser: 1,
      applicablePlanIds: [],
      ...coupon,
    });
  }
  async function memberAction(action) {
    await onMemberAction(selected, action, note);
    setNote("");
  }

  return (
    <section className="page fullAdminConsole">
      <div className="adminShell">
        <aside className="adminSidebar">
          <div>
            <small>SUPER ADMIN</small>
            <h2>Admin Console</h2>
            <p>Secure operations centre</p>
          </div>
          <nav>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => choose(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="adminMain">
          {tab === "dashboard" && (
            <>
              <AdminHeading
                title="Dashboard"
                text="Live operational overview for Mangalsaath."
              />
              <div className="adminMetricGrid">
                <Metric label="Registered users" value={admin.stats?.users} />
                <Metric label="Profiles" value={admin.stats?.profiles} />
                <Metric
                  label="Pending approvals"
                  value={admin.stats?.pendingApprovals}
                />
                <Metric
                  label="Pending mobile"
                  value={admin.stats?.pendingMobileVerification}
                />
                <Metric
                  label="Approved members"
                  value={admin.stats?.approvedMembers}
                />
                <Metric
                  label="Premium members"
                  value={admin.stats?.premiumMembers}
                />
                <Metric label="Open reports" value={admin.stats?.openReports} />
                <Metric label="Revenue" value={money(admin.stats?.revenue)} />
                <Metric
                  label="Interests today"
                  value={admin.stats?.interestsToday}
                />
                <Metric
                  label="Messages today"
                  value={admin.stats?.messagesToday}
                />
              </div>
              <Panel title="Recent activity">
                <LogList rows={(admin.activities || []).slice(0, 12)} />
              </Panel>
            </>
          )}

          {tab === "members" && (
            <>
              <AdminHeading
                title="Members"
                text="Search, review, approve, suspend and document member accounts."
              />
              <div className="adminFilters">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, name, email, mobile, city, religion or caste"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All members</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="adminSplit">
                <Panel title={`${members.length} member(s)`}>
                  <div className="adminRows">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        className={selected?.id === m.id ? "selected" : ""}
                        onClick={() => {
                          setSelected(m);
                          setNote("");
                        }}
                      >
                        <b>
                          {m.firstName} {m.lastName}
                        </b>
                        <span>
                          {m.email} · {m.mobile}
                        </span>
                        {status(m.status)}
                      </button>
                    ))}
                    {!members.length && (
                      <Empty text="No members match this filter." />
                    )}
                  </div>
                </Panel>
                <Panel title="Member review">
                  {selected ? (
                    <MemberReview
                      member={selected}
                      note={note}
                      setNote={setNote}
                      busy={busy}
                      act={memberAction}
                    />
                  ) : (
                    <Empty text="Select a member to open the review workspace." />
                  )}
                </Panel>
              </div>
            </>
          )}

          {tab === "verification" && (
            <>
              <AdminHeading
                title="Verification"
                text="Profile, photo and manual mobile-verification queue."
              />
              <div className="adminSplit">
                <Panel title={`${(admin.verificationQueue || []).length} verification item(s)`}>
                  <div className="adminRows">
                    {(admin.verificationQueue || []).map((m) => (
                      <button
                        key={m.id}
                        className={selected?.id === m.id ? "selected" : ""}
                        onClick={() => {
                          setSelected(m);
                          setNote("");
                        }}
                      >
                        <b>{m.firstName} {m.lastName}</b>
                        <span>{m.email} · {m.mobile}</span>
                        <span>
                          Profile: {m.profile?.verificationStatus || "not requested"}
                          {" · "}Mobile: {m.mobileVerificationStatus || "pending"}
                        </span>
                      </button>
                    ))}
                    {!(admin.verificationQueue || []).length && (
                      <Empty text="No verification requests are waiting." />
                    )}
                  </div>
                </Panel>
                <Panel title="Manual verification review">
                  {selected ? (
                    <MemberReview
                      member={selected}
                      note={note}
                      setNote={setNote}
                      busy={busy}
                      act={memberAction}
                    />
                  ) : (
                    <Empty text="Select a member to approve identity or verify the mobile number manually." />
                  )}
                </Panel>
              </div>
            </>
          )}

          {tab === "payments" && (
            <>
              <AdminHeading
                title="Payments"
                text="Review manual UPI submissions and inspect transaction history."
              />
              <div className="adminTable">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Reference</th>
                      <th>Amount</th>
                      <th>Gateway</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(admin.transactions || []).map((t) => (
                      <tr key={t.id}>
                        <td>
                          {t.memberName || t.memberEmail || "Unknown"}
                          <small>{t.memberMobile}</small>
                        </td>
                        <td>
                          {t.manualReference || t.gatewayPaymentId || t.id}
                        </td>
                        <td>{money(t.amount)}</td>
                        <td>{t.gateway}</td>
                        <td>{status(t.status)}</td>
                        <td>
                          {t.status === "pending" && ["manual", "manual-upi"].includes(t.gateway) ? (
                            <>
                              <button
                                onClick={() => onPaymentReview(t.id, "approve")}
                              >
                                Approve
                              </button>
                              <button
                                className="danger"
                                onClick={() => onPaymentReview(t.id, "reject")}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(admin.transactions || []).length && (
                  <Empty text="No payment transactions yet." />
                )}
              </div>
            </>
          )}

          {tab === "plans" && (
            <>
              <AdminHeading
                title="Membership Plans"
                text="Create and maintain pricing, duration and availability."
                action={<button onClick={() => editPlan()}>Add plan</button>}
              />
              <div className="adminCardGrid">
                {plans.map((p) => (
                  <article key={p.id}>
                    <div>
                      {status(p.active ? "active" : "inactive")}
                      <h3>{p.name}</h3>
                    </div>
                    <b>{money(p.price)}</b>
                    <p>
                      {p.durationDays} days ·{" "}
                      {p.description || "No description"}
                    </p>
                    <button onClick={() => editPlan(p)}>Edit</button>
                  </article>
                ))}
              </div>
              {planDraft && (
                <Editor
                  title="Plan editor"
                  close={() => setPlanDraft(null)}
                  save={async () => {
                    await onSavePlan(planDraft);
                    setPlanDraft(null);
                  }}
                >
                  <Field
                    label="Plan name"
                    value={planDraft.name || ""}
                    set={(v) => setPlanDraft({ ...planDraft, name: v })}
                  />
                  <Field
                    label="Plan ID / slug"
                    value={planDraft.id || ""}
                    set={(v) => setPlanDraft({ ...planDraft, id: v })}
                    disabled={Boolean(planDraft.createdAt)}
                  />
                  <Field
                    label="Price (₹)"
                    type="number"
                    value={planDraft.price ?? 0}
                    set={(v) => setPlanDraft({ ...planDraft, price: v })}
                  />
                  <Field
                    label="Duration (days)"
                    type="number"
                    value={planDraft.durationDays ?? 0}
                    set={(v) => setPlanDraft({ ...planDraft, durationDays: v })}
                  />
                  <Field
                    label="Description"
                    value={planDraft.description || ""}
                    set={(v) => setPlanDraft({ ...planDraft, description: v })}
                  />
                  <Check
                    label="Active"
                    checked={planDraft.active !== false}
                    set={(v) => setPlanDraft({ ...planDraft, active: v })}
                  />
                </Editor>
              )}
            </>
          )}

          {tab === "promotions" && (
            <>
              <AdminHeading
                title="Coupons & Offers"
                text="Manage discount codes and review homepage promotional offers."
                action={
                  <button onClick={() => editCoupon()}>Add coupon</button>
                }
              />
              <h3>Coupons</h3>
              <div className="adminCardGrid">
                {coupons.map((c) => (
                  <article key={c.id}>
                    <div>
                      {status(c.active ? "active" : "inactive")}
                      <h3>{c.code}</h3>
                    </div>
                    <b>
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : money(c.discountValue)}
                    </b>
                    <p>{c.usageCount || 0} redemption(s)</p>
                    <button onClick={() => editCoupon(c)}>Edit</button>
                    <button
                      className="danger"
                      onClick={() => onDeleteCoupon(c.id)}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
              {!coupons.length && <Empty text="No coupons configured." />}
              <div className="adminSectionTitle">
                <h3 className="adminSubheading">Homepage offers</h3>
                <button
                  onClick={() =>
                    setOfferDraft({
                      active: true,
                      title: "",
                      subtitle: "",
                      couponCode: "",
                      priority: 0,
                    })
                  }
                >
                  Add offer
                </button>
              </div>
              <div className="adminCardGrid">
                {offers.map((o) => (
                  <article key={o.id}>
                    <div>
                      {status(o.active ? "active" : "inactive")}
                      <h3>{o.title || o.id}</h3>
                    </div>
                    <p>{o.subtitle || o.description || "No description"}</p>
                    <small>Priority {o.priority || 0}</small>
                    <div>
                      <button onClick={() => setOfferDraft(o)}>Edit</button>
                      <button
                        className="danger"
                        onClick={() => onDeleteOffer(o.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!offers.length && (
                <Empty text="No homepage offers configured." />
              )}
              {couponDraft && (
                <Editor
                  title="Coupon editor"
                  close={() => setCouponDraft(null)}
                  save={async () => {
                    await onSaveCoupon(couponDraft);
                    setCouponDraft(null);
                  }}
                >
                  <Field
                    label="Code"
                    value={couponDraft.code || ""}
                    set={(v) =>
                      setCouponDraft({ ...couponDraft, code: v.toUpperCase() })
                    }
                  />
                  <label>
                    Discount type
                    <select
                      value={couponDraft.discountType}
                      onChange={(e) =>
                        setCouponDraft({
                          ...couponDraft,
                          discountType: e.target.value,
                        })
                      }
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </label>
                  <Field
                    label="Discount value"
                    type="number"
                    value={couponDraft.discountValue || 1}
                    set={(v) =>
                      setCouponDraft({ ...couponDraft, discountValue: v })
                    }
                  />
                  <Field
                    label="Maximum uses (0 = unlimited)"
                    type="number"
                    value={couponDraft.maxUses ?? 0}
                    set={(v) => setCouponDraft({ ...couponDraft, maxUses: v })}
                  />
                  <Check
                    label="Active"
                    checked={couponDraft.active !== false}
                    set={(v) => setCouponDraft({ ...couponDraft, active: v })}
                  />
                </Editor>
              )}
              {offerDraft && (
                <Editor
                  title="Homepage offer editor"
                  close={() => setOfferDraft(null)}
                  save={async () => {
                    await onSaveOffer(offerDraft);
                    setOfferDraft(null);
                  }}
                >
                  <Field
                    label="Title"
                    value={offerDraft.title || ""}
                    set={(v) => setOfferDraft({ ...offerDraft, title: v })}
                  />
                  <Field
                    label="Subtitle"
                    value={offerDraft.subtitle || ""}
                    set={(v) => setOfferDraft({ ...offerDraft, subtitle: v })}
                  />
                  <Field
                    label="Coupon code"
                    value={offerDraft.couponCode || ""}
                    set={(v) =>
                      setOfferDraft({
                        ...offerDraft,
                        couponCode: v.toUpperCase(),
                      })
                    }
                  />
                  <Field
                    label="Priority"
                    type="number"
                    value={offerDraft.priority ?? 0}
                    set={(v) => setOfferDraft({ ...offerDraft, priority: v })}
                  />
                  <Check
                    label="Active"
                    checked={offerDraft.active !== false}
                    set={(v) => setOfferDraft({ ...offerDraft, active: v })}
                  />
                </Editor>
              )}
            </>
          )}

          {tab === "reports" && (
            <>
              <AdminHeading
                title="Safety Reports"
                text="Resolve or dismiss member safety and abuse reports with an accountable note."
              />
              <div className="adminTable">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Details</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Review note</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(admin.reports || []).map((r) => (
                      <tr key={r.id}>
                        <td>{r.category}</td>
                        <td>{r.details}</td>
                        <td>{r.targetUserId}</td>
                        <td>{status(r.status)}</td>
                        <td>
                          <input
                            value={reportNotes[r.id] || ""}
                            onChange={(e) =>
                              setReportNotes({
                                ...reportNotes,
                                [r.id]: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          {r.status === "open" ? (
                            <>
                              <button
                                onClick={() =>
                                  onReportReview(
                                    r.id,
                                    "resolve-report",
                                    reportNotes[r.id] || "",
                                  )
                                }
                              >
                                Resolve
                              </button>
                              <button
                                className="danger"
                                onClick={() =>
                                  onReportReview(
                                    r.id,
                                    "dismiss-report",
                                    reportNotes[r.id] || "",
                                  )
                                }
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            "Reviewed"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(admin.reports || []).length && (
                  <Empty text="No safety reports have been submitted." />
                )}
              </div>
            </>
          )}

          {tab === "settings" && (
            <>
              <AdminHeading
                title="Business Settings"
                text="Website identity, contact, payment and protected Super Admin settings."
              />
              <div className="adminSettingsGrid">
                {[
                  ["businessName", "Business name"],
                  ["businessAddress", "Business address"],
                  ["gstin", "GSTIN"],
                  ["supportEmail", "Support email"],
                  ["supportMobile", "Support mobile"],
                  ["whatsapp", "WhatsApp"],
                  ["upiId", "UPI ID"],
                  ["websiteUrl", "Website URL"],
                  ["seoTitle", "SEO title"],
                  ["seoDescription", "SEO description"],
                  ["superAdminEmail", "Super Admin email"],
                  ["superAdminMobile", "Super Admin mobile"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={settingsDraft[key] ?? settings[key] ?? ""}
                    set={(v) =>
                      setSettingsDraft({ ...settingsDraft, [key]: v })
                    }
                  />
                ))}
              </div>
              <div className="adminSettingsActions">
                <button
                  onClick={() =>
                    onSaveSettings({ ...settings, ...settingsDraft })
                  }
                >
                  Save settings
                </button>
                <label className="adminUpload">
                  Upload payment QR
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => onUploadQr(e.target.files?.[0])}
                  />
                </label>
                <button className="danger" onClick={onRemoveQr}>
                  Remove QR
                </button>
              </div>
            </>
          )}

          {tab === "audit" && (
            <>
              <AdminHeading
                title="Audit Logs"
                text="Immutable record of administrative and security-sensitive activity."
              />
              <div className="adminTable">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Entity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((a) => (
                      <tr key={a.id}>
                        <td>{date(a.createdAt)}</td>
                        <td>{a.action || a.type}</td>
                        <td>{a.actorUserId || "System"}</td>
                        <td>
                          {a.entityType || "—"} {a.entityId || ""}
                        </td>
                        <td>{a.note || a.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!audits.length && (
                  <Empty text="No administrative activity recorded yet." />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

function AdminHeading({ title, text, action }) {
  return (
    <div className="adminHeading">
      <div>
        <small>ADMIN CONSOLE</small>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <article>
      <small>{label}</small>
      <b>{value ?? 0}</b>
    </article>
  );
}
function Panel({ title, children }) {
  return (
    <section className="adminPanel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function Empty({ text }) {
  return <div className="adminEmpty">{text}</div>;
}
function LogList({ rows }) {
  return (
    <div className="adminLogList">
      {rows.map((r) => (
        <p key={r.id}>
          <b>{r.action || r.type}</b>
          <span>{date(r.createdAt)}</span>
          <small>{r.note || r.description}</small>
        </p>
      ))}
      {!rows.length && <Empty text="No activity recorded." />}
    </div>
  );
}
function Field({ label, value, set, type = "text", disabled = false }) {
  return (
    <label>
      {label}
      <input
        disabled={disabled}
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
function Check({ label, checked, set }) {
  return (
    <label className="adminCheck">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Editor({ title, children, close, save }) {
  return (
    <div className="adminEditor">
      <div>
        <h3>{title}</h3>
        <button onClick={close}>Close</button>
      </div>
      <div className="adminEditorGrid">{children}</div>
      <button className="primary" onClick={save}>
        Save
      </button>
    </div>
  );
}
function MemberReview({ member, note, setNote, busy, act }) {
  const p = member.profile || {};
  return (
    <div className="adminReview">
      <h3>
        {member.firstName} {member.lastName}
      </h3>
      <p>
        {member.id} · {member.email} · {member.mobile}
      </p>
      <div className="adminReviewGrid">
        <article>
          <b>Profile</b>
          <p>
            {p.gender || "—"} · {p.city || "City pending"}
          </p>
        </article>
        <article>
          <b>Community</b>
          <p>
            {p.religion || "—"} · {p.caste || "—"}
          </p>
        </article>
        <article>
          <b>Approval</b>
          <p>{member.approvalStatus || "pending"}</p>
        </article>
        <article>
          <b>Mobile</b>
          <p>{member.mobileVerificationStatus || "pending"}</p>
        </article>
      </div>
      <label>
        Internal note / action reason
        <textarea
          maxLength="500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="adminActionBar">
        <button
          disabled={busy || member.mobileVerified}
          onClick={() => act("verify-mobile")}
        >
          Mark mobile manually verified
        </button>
        <button
          disabled={busy || member.mobileVerificationStatus === "rejected" || !note.trim()}
          className="danger"
          onClick={() => act("reject-mobile")}
        >
          Reject mobile
        </button>
        <button
          disabled={busy || !p.id || p.verificationStatus !== "requested"}
          onClick={() => act("approve")}
        >
          Approve identity/profile
        </button>
        <button
          disabled={busy || !p.id || p.verificationStatus !== "requested" || !note.trim()}
          className="danger"
          onClick={() => act("reject")}
        >
          Reject identity/profile
        </button>
        {member.status === "suspended" ? (
          <button disabled={busy} onClick={() => act("activate-member")}>
            Reactivate
          </button>
        ) : (
          <button
            disabled={busy || !note.trim()}
            className="danger"
            onClick={() => act("suspend-member")}
          >
            Suspend
          </button>
        )}
        <button
          disabled={busy || !note.trim()}
          onClick={() => act("add-member-note")}
        >
          Save note
        </button>
      </div>
    </div>
  );
}
