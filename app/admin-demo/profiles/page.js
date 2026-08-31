"use client";

import { useCallback, useEffect, useState } from "react";

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

const emptyForm = {
  firstName: "", lastName: "", gender: "", dateOfBirth: "", placeOfBirth: "", timeOfBirth: "",
  age: "", maritalStatus: "", height: "", religion: "", caste: "", subCaste: "", gotra: "",
  education: "", profession: "", annualCtc: "", country: "India", state: "", city: "", about: "",
  partnerAgeMin: "", partnerAgeMax: "", partnerReligion: "", partnerCaste: "", partnerLocation: "",
  partnerMaritalStatus: "", partnerEducation: "", partnerProfession: "",
};

function profileToForm(profile) {
  return {
    ...emptyForm,
    firstName: profile.user?.firstName || "",
    lastName: profile.user?.lastName || "",
    gender: profile.gender || "",
    dateOfBirth: profile.dateOfBirth || "",
    placeOfBirth: profile.placeOfBirth || "",
    timeOfBirth: profile.timeOfBirth || "",
    age: profile.age ?? "",
    maritalStatus: profile.maritalStatus || "",
    height: profile.height ?? "",
    religion: profile.religion || "",
    caste: profile.caste || "",
    subCaste: profile.subCaste || "",
    gotra: profile.gotra || "",
    education: profile.education || "",
    profession: profile.profession || "",
    annualCtc: profile.annualCtc || "",
    country: profile.country || "India",
    state: profile.state || "",
    city: profile.city || "",
    about: profile.about || "",
    partnerAgeMin: profile.partnerAgeMin ?? "",
    partnerAgeMax: profile.partnerAgeMax ?? "",
    partnerReligion: profile.partnerReligion || "",
    partnerCaste: profile.partnerCaste || "",
    partnerLocation: profile.partnerLocation || "",
    partnerMaritalStatus: profile.partnerMaritalStatus || "",
    partnerEducation: profile.partnerEducation || "",
    partnerProfession: profile.partnerProfession || "",
  };
}

export default function EditAiProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (page = 1, q = query) => {
    setError("");
    try {
      const data = await api(`/api/admin/demo-profiles?page=${page}&pageSize=50&search=${encodeURIComponent(q)}`);
      setProfiles(data.profiles || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    }
  }, [query]);

  useEffect(() => { load(1, ""); }, []);

  function startEdit(profile) {
    setEditing(profile);
    setForm(profileToForm(profile));
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/api/admin/demo-profiles", {
        method: "POST",
        body: JSON.stringify({ action: "edit", profileId: editing.id, ...form }),
      });
      setNotice(result.message || "AI profile updated.");
      setEditing(null);
      await load(pagination.page, query);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runSearch(e) {
    e.preventDefault();
    const q = search.trim();
    setQuery(q);
    await load(1, q);
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <small style={s.eyebrow}>SUPER ADMIN ONLY</small>
          <h1 style={s.h1}>Edit AI Profiles</h1>
          <p style={s.muted}>Search and amend synthetic profile details. Mangalsaath ID and AI visibility are preserved automatically.</p>
        </div>
        <div style={s.headerActions}>
          <a href="/admin-demo/gallery" style={s.link}>AI Gallery</a>
          <a href="/" style={s.link}>Back to Admin Console</a>
        </div>
      </header>

      {error && <div style={s.error}>{error}</div>}
      {notice && <div style={s.success}>{notice}</div>}

      {editing && (
        <section style={s.panel}>
          <div style={s.panelHead}>
            <div>
              <h2 style={s.h2}>Edit: {editing.name}</h2>
              <p style={s.idLine}><b>Mangalsaath ID: {editing.mangalsaathId || "—"}</b></p>
              <p style={s.muted}>Internal profile key: {editing.id} · Current visibility: {editing.demoVisible ? "Enabled" : "Hidden"}</p>
            </div>
            <button style={s.secondary} onClick={() => setEditing(null)} disabled={busy}>Close</button>
          </div>

          <div style={s.grid}>
            <Field label="First name" value={form.firstName} set={(v) => setField("firstName", v)} />
            <Field label="Last name" value={form.lastName} set={(v) => setField("lastName", v)} />
            <Field label="Gender" value={form.gender} set={(v) => setField("gender", v)} />
            <Field label="Date of birth" type="date" value={form.dateOfBirth} set={(v) => setField("dateOfBirth", v)} />
            <Field label="Age" type="number" value={form.age} set={(v) => setField("age", v)} />
            <Field label="Height (cm)" type="number" value={form.height} set={(v) => setField("height", v)} />
            <Field label="Marital status" value={form.maritalStatus} set={(v) => setField("maritalStatus", v)} />
            <Field label="Religion" value={form.religion} set={(v) => setField("religion", v)} />
            <Field label="Caste / Community" value={form.caste} set={(v) => setField("caste", v)} />
            <Field label="Sub-caste" value={form.subCaste} set={(v) => setField("subCaste", v)} />
            <Field label="Gotra" value={form.gotra} set={(v) => setField("gotra", v)} />
            <Field label="Education" value={form.education} set={(v) => setField("education", v)} />
            <Field label="Profession" value={form.profession} set={(v) => setField("profession", v)} />
            <Field label="Annual income / CTC" value={form.annualCtc} set={(v) => setField("annualCtc", v)} />
            <Field label="Country" value={form.country} set={(v) => setField("country", v)} />
            <Field label="State" value={form.state} set={(v) => setField("state", v)} />
            <Field label="City" value={form.city} set={(v) => setField("city", v)} />
            <Field label="Place of birth" value={form.placeOfBirth} set={(v) => setField("placeOfBirth", v)} />
            <Field label="Time of birth" type="time" value={form.timeOfBirth} set={(v) => setField("timeOfBirth", v)} />
          </div>

          <label style={s.label}>About
            <textarea style={{ ...s.input, minHeight: 110 }} value={form.about} onChange={(e) => setField("about", e.target.value)} />
          </label>

          <h3 style={s.h3}>Partner preferences</h3>
          <div style={s.grid}>
            <Field label="Age min" type="number" value={form.partnerAgeMin} set={(v) => setField("partnerAgeMin", v)} />
            <Field label="Age max" type="number" value={form.partnerAgeMax} set={(v) => setField("partnerAgeMax", v)} />
            <Field label="Religion" value={form.partnerReligion} set={(v) => setField("partnerReligion", v)} />
            <Field label="Caste / Community" value={form.partnerCaste} set={(v) => setField("partnerCaste", v)} />
            <Field label="Location" value={form.partnerLocation} set={(v) => setField("partnerLocation", v)} />
            <Field label="Marital status" value={form.partnerMaritalStatus} set={(v) => setField("partnerMaritalStatus", v)} />
            <Field label="Education" value={form.partnerEducation} set={(v) => setField("partnerEducation", v)} />
            <Field label="Profession" value={form.partnerProfession} set={(v) => setField("partnerProfession", v)} />
          </div>

          <div style={s.photoNote}>
            <b>Photos:</b> {Array.isArray(editing.photos) ? editing.photos.length : 0} attached · Primary photo: {editing.primaryPhoto || "Not set"}. Photo replacement/gallery management remains a separate controlled action.
          </div>

          <div style={s.actions}>
            <button style={s.primary} onClick={save} disabled={busy}>{busy ? "Saving..." : "Save AI Profile"}</button>
            <button style={s.secondary} onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          </div>
        </section>
      )}

      <section style={s.panel}>
        <div style={s.panelHead}>
          <div>
            <h2 style={s.h2}>All AI Profiles</h2>
            <p style={s.muted}>{pagination.total} profiles · Page {pagination.page} of {pagination.pages}</p>
          </div>
          <button style={s.secondary} onClick={() => load(pagination.page, query)} disabled={busy}>Refresh</button>
        </div>

        <form onSubmit={runSearch} style={s.searchRow}>
          <input style={s.search} placeholder="Search name, city, religion, caste, education, profession, income..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button style={s.primary} type="submit">Search</button>
          {query && <button type="button" style={s.secondary} onClick={async () => { setSearch(""); setQuery(""); await load(1, ""); }}>Clear</button>}
        </form>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr><th style={s.th}>Mangalsaath ID / Profile</th><th style={s.th}>Religion / Community</th><th style={s.th}>Education / Profession</th><th style={s.th}>Location</th><th style={s.th}>Income</th><th style={s.th}>Status</th><th style={s.th}>Action</th></tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td style={s.td}><b style={s.memberId}>{profile.mangalsaathId || "—"}</b><br /><b>{profile.name}</b><br /><small>{profile.gender || "—"}, {profile.age || "—"} yrs</small></td>
                  <td style={s.td}>{profile.religion || "—"}<br /><small>{profile.caste || "—"}{profile.subCaste ? ` / ${profile.subCaste}` : ""}</small></td>
                  <td style={s.td}>{profile.education || "—"}<br /><small>{profile.profession || "—"}</small></td>
                  <td style={s.td}>{profile.city || "—"}, {profile.state || "—"}</td>
                  <td style={s.td}>{profile.annualCtc || "—"}</td>
                  <td style={s.td}><span style={profile.demoVisible ? s.badgeOn : s.badgeOff}>{profile.demoVisible ? "Enabled" : "Hidden"}</span></td>
                  <td style={s.td}><button style={s.editButton} onClick={() => startEdit(profile)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!profiles.length && <p style={s.muted}>No AI profiles found.</p>}
        </div>

        <div style={s.pagination}>
          <button style={s.secondary} disabled={pagination.page <= 1 || busy} onClick={() => load(pagination.page - 1, query)}>Previous</button>
          <span>Page {pagination.page} / {pagination.pages}</span>
          <button style={s.secondary} disabled={pagination.page >= pagination.pages || busy} onClick={() => load(pagination.page + 1, query)}>Next</button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, set, type = "text" }) {
  return <label style={s.label}>{label}<input style={s.input} type={type} value={value ?? ""} onChange={(e) => set(e.target.value)} /></label>;
}

const s = {
  page: { maxWidth: 1320, margin: "0 auto", padding: "34px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22 },
  headerActions: { display: "flex", flexWrap: "wrap", gap: 14 },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.2 },
  h1: { margin: "7px 0 6px", fontSize: 36 }, h2: { margin: "0 0 8px", fontSize: 22 }, h3: { margin: "20px 0 12px" },
  muted: { color: "#776a6e", lineHeight: 1.5 }, link: { color: "#741f39", textDecoration: "none", fontWeight: 700 },
  idLine: { margin: "6px 0", color: "#741f39", fontSize: 15 }, memberId: { color: "#741f39", fontSize: 12 },
  panel: { background: "#fff", border: "1px solid #eadde1", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 10px 30px rgba(77,16,37,.05)" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 },
  label: { display: "grid", gap: 6, fontWeight: 700 }, input: { width: "100%", padding: 10, border: "1px solid #cebfc4", borderRadius: 8, boxSizing: "border-box" },
  actions: { display: "flex", gap: 10, marginTop: 18 }, primary: { border: 0, borderRadius: 9, padding: "10px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #741f39", borderRadius: 9, padding: "9px 13px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  error: { padding: 13, borderRadius: 10, background: "#fdeaea", color: "#8a1f2d", marginBottom: 14 }, success: { padding: 13, borderRadius: 10, background: "#e8f6ef", color: "#26704f", marginBottom: 14 },
  photoNote: { marginTop: 16, padding: 12, borderRadius: 10, background: "#faf6f7", color: "#5c4b51" },
  searchRow: { display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 16 }, search: { flex: "1 1 420px", padding: 11, border: "1px solid #cebfc4", borderRadius: 9 },
  tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 1120 }, th: { textAlign: "left", padding: 10, borderBottom: "1px solid #eadde1", color: "#776a6e", fontSize: 13 }, td: { padding: 11, borderBottom: "1px solid #f0e5e8", verticalAlign: "top" },
  badgeOn: { display: "inline-block", padding: "5px 8px", borderRadius: 999, background: "#e8f6ef", color: "#26704f", fontSize: 12, fontWeight: 700 }, badgeOff: { display: "inline-block", padding: "5px 8px", borderRadius: 999, background: "#f5edf0", color: "#6f5c62", fontSize: 12, fontWeight: 700 },
  editButton: { border: "1px solid #741f39", borderRadius: 7, padding: "7px 11px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" }, pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 18 },
};