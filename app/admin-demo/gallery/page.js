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

function photoSrc(photo) {
  return photo?.url || photo?.data || "";
}

export default function AiGalleryPage() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [replaceUrl, setReplaceUrl] = useState("");
  const [replaceId, setReplaceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(q = search.trim()) {
    setError("");
    try {
      const data = await api(`/api/admin/demo-profiles?page=1&pageSize=100&search=${encodeURIComponent(q)}`);
      setProfiles(data.profiles || []);
      if (selected) {
        const fresh = (data.profiles || []).find((item) => item.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(""); }, []);

  async function galleryAction(action, extra = {}) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/api/admin/demo-profiles/gallery", {
        method: "POST",
        body: JSON.stringify({ action, profileId: selected.id, ...extra }),
      });
      setNotice(result.message || "Gallery updated.");
      setSelected((current) => current ? { ...current, ...result.profile } : current);
      setNewUrl("");
      setReplaceUrl("");
      setReplaceId("");
      await load(search.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file) {
    if (!selected || !file) return;
    setUploadBusy(true);
    setError("");
    setNotice("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";
      const signatureResponse = await fetch(`/api/admin/demo-profiles/gallery/upload-signature?profileId=${encodeURIComponent(selected.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const signatureData = await signatureResponse.json().catch(() => ({}));
      if (!signatureResponse.ok) throw new Error(signatureData.error || "Unable to prepare image upload.");

      if (!signatureData.limits?.mimeTypes?.includes(file.type)) {
        throw new Error("Use JPG, PNG, WebP, or AVIF images only.");
      }
      if (file.size > Number(signatureData.limits?.maxBytes || 0)) {
        throw new Error("Image is too large. Maximum size is 8 MB.");
      }

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signatureData.apiKey);
      form.append("timestamp", String(signatureData.timestamp));
      form.append("folder", signatureData.folder);
      form.append("transformation", signatureData.transformation);
      form.append("signature", signatureData.signature);

      const uploadResponse = await fetch(signatureData.uploadUrl, { method: "POST", body: form });
      const uploaded = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploaded.secure_url) {
        throw new Error(uploaded?.error?.message || "External image upload failed.");
      }

      await galleryAction("add-url", { url: uploaded.secure_url, label: file.name.replace(/\.[^.]+$/, "") || "Profile photo" });
      setNotice("Photo uploaded to external storage and added to the gallery.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadBusy(false);
    }
  }

  const photos = Array.isArray(selected?.photos) ? selected.photos : [];

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <small style={s.eyebrow}>SUPER ADMIN ONLY</small>
          <h1 style={s.h1}>AI Profile Gallery</h1>
          <p style={s.muted}>Manage up to 5 externally stored photos per synthetic profile. Image binaries are not stored in GitHub or the Mangalsaath database.</p>
        </div>
        <a href="/admin-demo/profiles" style={s.link}>Edit AI Profiles</a>
      </header>

      {error && <div style={s.error}>{error}</div>}
      {notice && <div style={s.success}>{notice}</div>}

      <section style={s.panel}>
        <div style={s.searchRow}>
          <input style={s.input} placeholder="Search AI profile..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button style={s.primary} onClick={() => load(search.trim())} disabled={busy || uploadBusy}>Search</button>
          <button style={s.secondary} onClick={() => { setSearch(""); load(""); }} disabled={busy || uploadBusy}>Clear</button>
        </div>
        <div style={s.profileGrid}>
          {profiles.map((profile) => (
            <button key={profile.id} style={selected?.id === profile.id ? s.profileSelected : s.profileButton} onClick={() => setSelected(profile)}>
              <b>{profile.name}</b>
              <span>{profile.city || "—"}, {profile.state || "—"}</span>
              <small>{Array.isArray(profile.photos) ? profile.photos.length : 0}/5 photos</small>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section style={s.panel}>
          <div style={s.panelHead}>
            <div>
              <h2 style={s.h2}>{selected.name}</h2>
              <p style={s.muted}>Profile ID: {selected.id} · Visibility: {selected.demoVisible ? "Enabled" : "Hidden"}</p>
            </div>
            <b>{photos.length}/5 photos</b>
          </div>

          <div style={s.gallery}>
            {photos.map((photo, index) => (
              <article key={photo.id} style={s.card}>
                {photoSrc(photo) ? <img src={photoSrc(photo)} alt={`Synthetic profile photo ${index + 1}`} style={s.image} /> : <div style={s.placeholder}>No preview</div>}
                <div style={s.cardBody}>
                  <b>{photo.label || `Photo ${index + 1}`}</b>
                  {selected.primaryPhoto === photo.id && <span style={s.primaryBadge}>Primary</span>}
                  <div style={s.cardActions}>
                    {selected.primaryPhoto !== photo.id && <button style={s.small} disabled={busy || uploadBusy} onClick={() => galleryAction("set-primary", { photoId: photo.id })}>Set Primary</button>}
                    <button style={s.small} disabled={busy || uploadBusy} onClick={() => { setReplaceId(photo.id); setReplaceUrl(photoSrc(photo)); }}>Replace URL</button>
                    <button style={s.smallDanger} disabled={busy || uploadBusy} onClick={() => { if (window.confirm("Remove this photo?")) galleryAction("remove", { photoId: photo.id }); }}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {photos.length < 5 && (
            <div style={s.formBox}>
              <h3 style={s.h3}>Upload photo to external storage</h3>
              <input
                style={s.input}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy || uploadBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) uploadFile(file);
                }}
              />
              <small style={s.muted}>JPG, PNG, WebP or AVIF · maximum 8 MB. Upload goes directly from your browser to external storage.</small>

              <div style={s.divider}>or add an existing HTTPS image URL</div>
              <input style={s.input} placeholder="https://... image URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              <button style={s.primary} disabled={busy || uploadBusy || !newUrl.trim()} onClick={() => galleryAction("add-url", { url: newUrl.trim() })}>Add Existing URL</button>
            </div>
          )}

          {replaceId && (
            <div style={s.formBox}>
              <h3 style={s.h3}>Replace selected photo URL</h3>
              <input style={s.input} placeholder="https://... replacement image URL" value={replaceUrl} onChange={(e) => setReplaceUrl(e.target.value)} />
              <div style={s.cardActions}>
                <button style={s.primary} disabled={busy || uploadBusy || !replaceUrl.trim()} onClick={() => galleryAction("replace-url", { photoId: replaceId, url: replaceUrl.trim() })}>Save Replacement</button>
                <button style={s.secondary} disabled={busy || uploadBusy} onClick={() => { setReplaceId(""); setReplaceUrl(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const s = {
  page: { maxWidth: 1320, margin: "0 auto", padding: "34px 20px 80px", fontFamily: "Arial, sans-serif", color: "#291d21" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22 },
  eyebrow: { color: "#741f39", fontWeight: 800, letterSpacing: 1.2 },
  h1: { margin: "7px 0 6px", fontSize: 36 }, h2: { margin: "0 0 6px" }, h3: { margin: "0 0 10px" },
  muted: { color: "#776a6e", lineHeight: 1.5 }, link: { color: "#741f39", textDecoration: "none", fontWeight: 700 },
  panel: { background: "#fff", border: "1px solid #eadde1", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 10px 30px rgba(77,16,37,.05)" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16 },
  searchRow: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginBottom: 16 },
  input: { width: "100%", padding: 10, border: "1px solid #cebfc4", borderRadius: 8, boxSizing: "border-box" },
  primary: { border: 0, borderRadius: 9, padding: "10px 14px", background: "#741f39", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid #741f39", borderRadius: 9, padding: "9px 13px", background: "#fff", color: "#741f39", fontWeight: 700, cursor: "pointer" },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 },
  profileButton: { textAlign: "left", display: "grid", gap: 4, padding: 12, border: "1px solid #e4d7db", borderRadius: 10, background: "#fff", cursor: "pointer" },
  profileSelected: { textAlign: "left", display: "grid", gap: 4, padding: 12, border: "2px solid #741f39", borderRadius: 10, background: "#fff8fb", cursor: "pointer" },
  gallery: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 },
  card: { border: "1px solid #eadde1", borderRadius: 12, overflow: "hidden", background: "#fff" },
  image: { width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" },
  placeholder: { aspectRatio: "1/1", display: "grid", placeItems: "center", background: "#f4eef0", color: "#776a6e" },
  cardBody: { padding: 10, display: "grid", gap: 8 }, primaryBadge: { width: "fit-content", padding: "3px 7px", borderRadius: 999, background: "#e8f6ef", color: "#26704f", fontSize: 12, fontWeight: 700 },
  cardActions: { display: "flex", flexWrap: "wrap", gap: 7 }, small: { border: "1px solid #cebfc4", borderRadius: 7, padding: "6px 8px", background: "#fff", cursor: "pointer" }, smallDanger: { border: "1px solid #d9a8ae", borderRadius: 7, padding: "6px 8px", background: "#fff5f6", color: "#941f2e", cursor: "pointer" },
  formBox: { marginTop: 18, padding: 14, border: "1px dashed #cebfc4", borderRadius: 10, display: "grid", gap: 10 },
  divider: { textAlign: "center", color: "#8b7b80", fontSize: 12, fontWeight: 700, margin: "2px 0" },
  error: { padding: 14, borderRadius: 10, background: "#fdeaea", color: "#8a1f2d", marginBottom: 16 }, success: { padding: 14, borderRadius: 10, background: "#e8f6ef", color: "#26704f", marginBottom: 16 },
};
