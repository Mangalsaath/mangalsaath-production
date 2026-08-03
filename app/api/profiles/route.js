import { NextResponse } from "next/server";
import { readDb, writeDb, getUser, calculateAge, isDatabaseWriteConflict } from "@/lib/db";
import { isProfilePublishable, presentOwnerProfile, presentPublicProfile } from "@/lib/profile-visibility";
import { blockedUserIdsFor, isBlockedBetween } from "@/lib/safety";
import { relationalProfileEnabled, findProfileById, findProfileByUserId, ensureRelationalProfile, updateRelationalProfile } from "@/lib/relational-profile";
import { prisma } from "@/lib/prisma";
import { calculateCompatibility } from "@/lib/matching";
import { getSystemSettings } from "@/lib/settings-service";
import { isAdminRole } from "@/lib/roles";

function isEnabled(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function conflictResponse() {
  return NextResponse.json({ error: "Your data changed in another request. Please refresh and try again." }, { status: 409 });
}

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const mine = url.searchParams.get("mine") === "true";
  const db = await readDb();
  const settings = await getSystemSettings();
  const currentUser = await getUser(request);
  const isAdmin = isAdminRole(currentUser?.role);

  if (isEnabled(settings.maintenanceMode) && !isAdmin) {
    return NextResponse.json({ error: "Mangalsaath is temporarily under maintenance." }, { status: 503, headers: { "Retry-After": "300" } });
  }

  if (mine) {
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isAdminRole(currentUser.role)) return NextResponse.json({ error: "Member profile not available." }, { status: 404 });
    if (relationalProfileEnabled()) {
      let found = await findProfileByUserId(currentUser.id);
      if (!found) {
        const legacyProfile = (db.profiles || []).find((item) => String(item.userId) === String(currentUser.id)) || null;
        found = await ensureRelationalProfile(currentUser.id, legacyProfile);
      }
      if (!found) return NextResponse.json({ error: "Your profile was not found." }, { status: 404 });
      return NextResponse.json(
        { profile: presentOwnerProfile(found.profile, found.user) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const profile = db.profiles.find((item) => item.userId === currentUser.id);
    if (!profile) return NextResponse.json({ error: "Your profile was not found." }, { status: 404 });
    return NextResponse.json(
      { profile: presentOwnerProfile(profile, currentUser) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (relationalProfileEnabled()) {
    if (id) {
      const found = await findProfileById(id);
      if (!found) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      const ownsProfile = currentUser?.id === found.user.id;
      if (!ownsProfile && !isAdmin && (!isProfilePublishable(found.profile, found.user) || (currentUser && isBlockedBetween(db, currentUser.id, found.user.id)))) {
        return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      }
      return NextResponse.json({ profile: ownsProfile || isAdmin ? presentOwnerProfile(found.profile, found.user) : presentPublicProfile(found.profile, found.user, { detail: true }) }, { headers: { "Cache-Control": "no-store" } });
    }

    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const city = url.searchParams.get("city") || "Any";
    const state = url.searchParams.get("state") || "Any";
    const religion = url.searchParams.get("religion") || "Any";
    const caste = url.searchParams.get("caste") || "Any";
    const education = url.searchParams.get("education") || "Any";
    const profession = url.searchParams.get("profession") || "Any";
    const gender = url.searchParams.get("gender") || "Any";
    const maritalStatus = url.searchParams.get("maritalStatus") || "Any";
    const verified = url.searchParams.get("verified") === "true";
    const ageMin = Math.max(18, Number(url.searchParams.get("ageMin")) || 18);
    const ageMax = Math.min(100, Number(url.searchParams.get("ageMax")) || 100);
    const heightMin = Math.max(100, Number(url.searchParams.get("heightMin")) || 100);
    const heightMax = Math.min(250, Number(url.searchParams.get("heightMax")) || 250);
    if (ageMin > ageMax || heightMin > heightMax) return NextResponse.json({ error: "Invalid search range." }, { status: 400 });
    const sort = url.searchParams.get("sort") || "match";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 6));
    const blockedIds = currentUser ? [...blockedUserIdsFor(db, currentUser.id)] : [];
    const excludedUserIds = [...blockedIds, ...(currentUser?.id ? [currentUser.id] : [])];
    const and = [];
    if (verified) and.push({ OR: [{ verified: true }, { trustedProfile: true }] });
    if (q) and.push({ OR: [
      { name: { contains: q } }, { city: { contains: q } }, { state: { contains: q } },
      { country: { contains: q } }, { religion: { contains: q } }, { caste: { contains: q } },
      { subCaste: { contains: q } }, { profession: { contains: q } }, { education: { contains: q } }
    ] });
    const where = {
      user: { role: "member", status: "active", ...(excludedUserIds.length ? { id: { notIn: excludedUserIds } } : {}) },
      age: { gte: ageMin, lte: ageMax },
      height: { gte: heightMin, lte: heightMax },
      photoModerationStatus: "approved",
      ...(city !== "Any" ? { city } : {}),
      ...(state !== "Any" ? { state } : {}),
      ...(religion !== "Any" ? { religion } : {}),
      ...(caste !== "Any" ? { caste } : {}),
      ...(education !== "Any" ? { education: { contains: education } } : {}),
      ...(profession !== "Any" ? { profession: { contains: profession } } : {}),
      ...(gender !== "Any" ? { gender } : {}),
      ...(maritalStatus !== "Any" ? { maritalStatus } : {}),
      ...(and.length ? { AND: and } : {})
    };
    const orderBy = sort === "ageAsc" ? { age: "asc" } : sort === "ageDesc" ? { age: "desc" } : sort === "newest" ? { createdAt: "desc" } : sort === "recent" ? { updatedAt: "desc" } : { score: "desc" };
    const candidates = await prisma.memberProfile.findMany({ where, include: { user: true }, orderBy, take: 500 });
    const viewerRecord = currentUser ? await prisma.memberProfile.findUnique({ where: { userId: currentUser.id } }) : null;
    let publishable = candidates.map((record) => {
      const profile = { ...record, dateOfBirth: record.dateOfBirth?.toISOString().slice(0, 10), photos: Array.isArray(record.photos) ? record.photos : [] };
      return { profile, user: record.user, compatibility: calculateCompatibility(viewerRecord, profile) };
    }).filter(({ profile, user }) => isProfilePublishable(profile, user));
    if (sort === "match") publishable.sort((a, b) => b.compatibility.score - a.compatibility.score || new Date(b.profile.updatedAt) - new Date(a.profile.updatedAt));
    const total = publishable.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const offset = (safePage - 1) * limit;
    const profiles = publishable.slice(offset, offset + limit).map(({ profile, user, compatibility }) => ({ ...presentPublicProfile(profile, user), matchScore: compatibility.score, matchReasons: compatibility.reasons }));
    const facets = {
      cities: [...new Set(publishable.map(({ profile }) => profile.city).filter(Boolean))].sort().slice(0, 100),
      religions: [...new Set(publishable.map(({ profile }) => profile.religion).filter(Boolean))].sort().slice(0, 100)
    };
    return NextResponse.json({ profiles, pagination: { page: safePage, pages, total, limit }, facets }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (id) {
    const profile = db.profiles.find((item) => item.id === id);
    const owner = profile ? db.users.find((item) => item.id === profile.userId) : null;
    if (!profile || !owner) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const ownsProfile = currentUser?.id === owner.id;
    if (!ownsProfile && !isAdmin && (!isProfilePublishable(profile, owner) || (currentUser && isBlockedBetween(db, currentUser.id, owner.id)))) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json({ profile: ownsProfile || isAdmin ? presentOwnerProfile(profile, owner) : presentPublicProfile(profile, owner, { detail: true }) }, { headers: { "Cache-Control": "no-store" } });
  }

  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const city = url.searchParams.get("city") || "Any";
  const religion = url.searchParams.get("religion") || "Any";
  const maritalStatus = url.searchParams.get("maritalStatus") || "Any";
  const verified = url.searchParams.get("verified") === "true";
  const ageMin = Math.max(18, Number(url.searchParams.get("ageMin")) || 18);
  const ageMax = Math.min(100, Number(url.searchParams.get("ageMax")) || 100);
  const sort = url.searchParams.get("sort") || "match";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 6));

  const blockedIds = currentUser ? blockedUserIdsFor(db, currentUser.id) : new Set();
  let profiles = db.profiles.filter((profile) => {
    const owner = db.users.find((user) => user.id === profile.userId);
    if (!isProfilePublishable(profile, owner) || blockedIds.has(owner?.id) || owner?.id === currentUser?.id) return false;
    const haystack = `${profile.name} ${profile.city} ${profile.state} ${profile.country} ${profile.religion} ${profile.caste} ${profile.subCaste || ""} ${profile.profession} ${profile.education}`.toLowerCase();
    return (!q || haystack.includes(q)) &&
      (city === "Any" || profile.city === city) &&
      (religion === "Any" || profile.religion === religion) &&
      (maritalStatus === "Any" || profile.maritalStatus === maritalStatus) &&
      (!verified || profile.verified || profile.trustedProfile) &&
      (Number(profile.age) || 0) >= ageMin &&
      (Number(profile.age) || 0) <= ageMax;
  });

  profiles = [...profiles].sort((a, b) => sort === "ageAsc" ? (a.age || 0) - (b.age || 0) : sort === "ageDesc" ? (b.age || 0) - (a.age || 0) : sort === "recent" ? new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0) : (b.score || 0) - (a.score || 0));
  const total = profiles.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const offset = (safePage - 1) * limit;
  const viewerProfile = currentUser ? db.profiles.find((item) => item.userId === currentUser.id) : null;
  const responseProfiles = profiles.slice(offset, offset + limit).map((profile) => { const compatibility = calculateCompatibility(viewerProfile, profile); return { ...presentPublicProfile(profile, db.users.find((user) => user.id === profile.userId)), matchScore: compatibility.score, matchReasons: compatibility.reasons }; });
  return NextResponse.json({ profiles: responseProfiles, pagination: { page: safePage, pages, total, limit } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const db = await readDb();
  const settings = await getSystemSettings();
  if (isEnabled(settings.maintenanceMode) && !isAdminRole(user.role)) return NextResponse.json({ error: "Mangalsaath is temporarily under maintenance." }, { status: 503 });

  if (relationalProfileEnabled()) {
    let found = await findProfileByUserId(user.id);
    if (!found) {
      const legacyProfile = (db.profiles || []).find((item) => String(item.userId) === String(user.id)) || null;
      found = await ensureRelationalProfile(user.id, legacyProfile);
    }
    if (!found) return NextResponse.json({ error: "Your profile was not found." }, { status: 404 });
    const required = ["firstName", "lastName", "gender", "dateOfBirth", "placeOfBirth", "timeOfBirth", "maritalStatus", "height", "religion", "caste", "education", "profession", "annualCtc", "brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried", "country", "state", "city", "about"];
    if (required.some((key) => body[key] === undefined || body[key] === null || !String(body[key]).trim())) return NextResponse.json({ error: "Please complete all essential fields." }, { status: 400 });
    const dob = new Date(`${String(body.dateOfBirth || "")}T00:00:00`);
    if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== String(body.dateOfBirth || "")) return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.timeOfBirth || ""))) return NextResponse.json({ error: "Please enter a valid time of birth." }, { status: 400 });
    if (String(body.placeOfBirth || "").trim().length > 180) return NextResponse.json({ error: "Place of birth must be 180 characters or less." }, { status: 400 });
    const age = calculateAge(body.dateOfBirth);
    if (age === null || age < 18) return NextResponse.json({ error: "Member must be at least 18 years old." }, { status: 400 });
    const aboutLength = String(body.about || "").trim().length;
    if (aboutLength < 40) return NextResponse.json({ error: "Please write at least 40 characters in About me." }, { status: 400 });
    if (aboutLength > 2000) return NextResponse.json({ error: "About me must be 2,000 characters or less." }, { status: 400 });
    const height = Number(body.height);
    if (!Number.isInteger(height) || height < 100 || height > 250) return NextResponse.json({ error: "Please enter height between 100 and 250 cm." }, { status: 400 });
    const siblingFields = ["brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried"];
    const siblingCounts = Object.fromEntries(siblingFields.map((key) => [key, Number(body[key])]));
    if (siblingFields.some((key) => !Number.isInteger(siblingCounts[key]) || siblingCounts[key] < 0 || siblingCounts[key] > 20)) return NextResponse.json({ error: "Please enter each sibling count as a whole number from 0 to 20." }, { status: 400 });
    const name = `${String(body.firstName || "").trim()} ${String(body.lastName || "").trim()}`.trim();
    const photos = Array.isArray(body.photos) ? body.photos.slice(0, 10).filter((photo) => photo && typeof photo.id === "string" && typeof photo.data === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(photo.data) && photo.data.length < 2_800_000) : [];
    const primaryPhoto = photos.some((photo) => photo.id === body.primaryPhoto) ? body.primaryPhoto : (photos[0]?.id || null);
    const partnerAgeMin = Number(body.partnerAgeMin) || 18;
    const partnerAgeMax = Number(body.partnerAgeMax) || 60;
    if (partnerAgeMin < 18 || partnerAgeMax > 100 || partnerAgeMin > partnerAgeMax) return NextResponse.json({ error: "Please enter a valid preferred age range." }, { status: 400 });
    const previousPhotoSignature = JSON.stringify((found.profile.photos || []).map((photo) => `${photo.id}:${photo.data?.length || 0}`));
    const currentPhotoSignature = JSON.stringify(photos.map((photo) => `${photo.id}:${photo.data?.length || 0}`));
    const photoChanged = previousPhotoSignature !== currentPhotoSignature;
    const nullable = (value) => String(value || "").trim() || null;
    const result = await updateRelationalProfile(user.id, {
      profile: {
        name, gender: nullable(body.gender), dateOfBirth: new Date(body.dateOfBirth), placeOfBirth: nullable(body.placeOfBirth), timeOfBirth: nullable(body.timeOfBirth), age, maritalStatus: nullable(body.maritalStatus), height,
        religion: nullable(body.religion), caste: nullable(body.caste), subCaste: nullable(body.subCaste), gotra: nullable(body.gotra), education: nullable(body.education),
        profession: nullable(body.profession), annualCtc: nullable(body.annualCtc), ...siblingCounts, country: nullable(body.country), state: nullable(body.state), city: nullable(body.city), about: nullable(body.about),
        partnerAgeMin, partnerAgeMax, partnerReligion: nullable(body.partnerReligion), partnerCaste: nullable(body.partnerCaste), partnerLocation: nullable(body.partnerLocation),
        partnerMaritalStatus: nullable(body.partnerMaritalStatus), partnerEducation: nullable(body.partnerEducation), partnerProfession: nullable(body.partnerProfession),
        photos, primaryPhoto, initials: name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(),
        ...(photoChanged ? { photoModerationStatus: photos.length ? "pending" : "not-submitted", photoModerationNote: null } : {})
      },
      user: { firstName: String(body.firstName).trim(), lastName: String(body.lastName).trim(), city: nullable(body.city), profession: nullable(body.profession) }
    });
    return NextResponse.json({ profile: presentOwnerProfile(result.profile, result.user) }, { headers: { "Cache-Control": "no-store" } });
  }

  const index = db.profiles.findIndex((profile) => profile.userId === user.id);
  if (index < 0) return NextResponse.json({ error: "Your profile was not found." }, { status: 404 });

  const required = ["firstName", "lastName", "gender", "dateOfBirth", "placeOfBirth", "timeOfBirth", "maritalStatus", "height", "religion", "caste", "education", "profession", "annualCtc", "brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried", "country", "state", "city", "about"];
  if (required.some((key) => body[key] === undefined || body[key] === null || !String(body[key]).trim())) return NextResponse.json({ error: "Please complete all essential fields." }, { status: 400 });
  const dob = new Date(`${String(body.dateOfBirth || "")}T00:00:00`);
  if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== String(body.dateOfBirth || "")) return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.timeOfBirth || ""))) return NextResponse.json({ error: "Please enter a valid time of birth." }, { status: 400 });
  if (String(body.placeOfBirth || "").trim().length > 180) return NextResponse.json({ error: "Place of birth must be 180 characters or less." }, { status: 400 });
  const age = calculateAge(body.dateOfBirth);
  if (age === null || age < 18) return NextResponse.json({ error: "Member must be at least 18 years old." }, { status: 400 });
  const aboutLength = String(body.about || "").trim().length;
  if (aboutLength < 40) return NextResponse.json({ error: "Please write at least 40 characters in About me." }, { status: 400 });
  if (aboutLength > 2000) return NextResponse.json({ error: "About me must be 2,000 characters or less." }, { status: 400 });
  const height = Number(body.height);
  if (!Number.isInteger(height) || height < 100 || height > 250) return NextResponse.json({ error: "Please enter height between 100 and 250 cm." }, { status: 400 });
  const siblingFields = ["brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried"];
  if (siblingFields.some((key) => !Number.isInteger(Number(body[key])) || Number(body[key]) < 0 || Number(body[key]) > 20)) return NextResponse.json({ error: "Please enter each sibling count as a whole number from 0 to 20." }, { status: 400 });
  body.name = `${String(body.firstName || "").trim()} ${String(body.lastName || "").trim()}`.trim();

  const allowed = ["name", "firstName", "lastName", "gender", "dateOfBirth", "placeOfBirth", "timeOfBirth", "maritalStatus", "height", "religion", "caste", "subCaste", "gotra", "education", "profession", "annualCtc", "brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried", "country", "state", "city", "about", "partnerAgeMin", "partnerAgeMax", "partnerReligion", "partnerCaste", "partnerLocation", "partnerMaritalStatus", "partnerEducation", "partnerProfession", "photos", "primaryPhoto"];
  const updated = { ...db.profiles[index] };
  for (const key of allowed) if (body[key] !== undefined) updated[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
  for (const key of siblingFields) updated[key] = Number(updated[key]);

  const previousPhotoSignature = JSON.stringify((db.profiles[index].photos || []).map((photo) => `${photo.id}:${photo.data?.length || 0}`));
  updated.photos = Array.isArray(updated.photos) ? updated.photos.slice(0, 10).filter((photo) => photo && typeof photo.id === "string" && typeof photo.data === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(photo.data) && photo.data.length < 2_800_000) : [];
  updated.primaryPhoto = updated.photos.some((photo) => photo.id === updated.primaryPhoto) ? updated.primaryPhoto : (updated.photos[0]?.id || "");
  updated.age = age;
  updated.partnerAgeMin = Number(updated.partnerAgeMin) || 18;
  updated.partnerAgeMax = Number(updated.partnerAgeMax) || 60;
  if (updated.partnerAgeMin < 18 || updated.partnerAgeMax > 100 || updated.partnerAgeMin > updated.partnerAgeMax) return NextResponse.json({ error: "Please enter a valid preferred age range." }, { status: 400 });

  const currentPhotoSignature = JSON.stringify(updated.photos.map((photo) => `${photo.id}:${photo.data?.length || 0}`));
  if (previousPhotoSignature !== currentPhotoSignature) {
    updated.photoModerationStatus = updated.photos.length ? "pending" : "not-submitted";
    updated.photoModerationNote = "";
  }
  updated.initials = updated.name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  updated.updatedAt = new Date().toISOString();
  db.profiles[index] = updated;

  const userIndex = db.users.findIndex((item) => item.id === user.id);
  if (userIndex >= 0) {
    const parts = updated.name.split(/\s+/);
    db.users[userIndex].firstName = parts[0] || "";
    db.users[userIndex].lastName = parts.slice(1).join(" ");
    db.users[userIndex].city = updated.city;
    db.users[userIndex].profession = updated.profession;
  }
  db.activities = db.activities || [];
  db.activities.unshift({ id: `a_${Date.now()}`, type: "profile_updated", userId: user.id, profileId: updated.id, description: `${updated.name} updated their profile`, createdAt: new Date().toISOString() });
  try {
    await writeDb(db);
  } catch (error) {
    if (isDatabaseWriteConflict(error)) return conflictResponse();
    throw error;
  }
  return NextResponse.json({ profile: presentOwnerProfile(updated, db.users[userIndex] || user) }, { headers: { "Cache-Control": "no-store" } });
}
