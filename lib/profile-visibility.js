import { calculateProfileCompletion, enrichProfile } from "@/lib/profile-quality";
import { isAdminRole } from "@/lib/roles";
import { isDemoProfileVisible } from "@/lib/demo-profile-control";

const PUBLIC_FIELDS = [
  "id", "name", "firstName", "lastName", "gender", "age", "placeOfBirth", "timeOfBirth", "maritalStatus", "height",
  "religion", "caste", "subCaste", "education", "profession", "annualCtc",
  "brothersMarried", "brothersUnmarried", "sistersMarried", "sistersUnmarried", "country", "state", "city",
  "about", "initials", "verified", "trustedProfile", "verificationStatus", "updatedAt", "createdAt"
];

function pick(source, fields) {
  return Object.fromEntries(fields.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));
}

export function getPrimaryPhoto(profile) {
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];
  return photos.find((photo) => photo.id === profile.primaryPhoto) || photos[0] || null;
}

export function isProfilePublishable(profile, user) {
  if (!profile || !user || isAdminRole(user.role) || user.status !== "active") return false;
  if (profile.isDemoProfile && !isDemoProfileVisible(profile)) return false;
  const completion = calculateProfileCompletion(profile).percent;
  const hasApprovedPhoto = Boolean(getPrimaryPhoto(profile)) && profile.photoModerationStatus === "approved";
  return completion >= 80 && hasApprovedPhoto;
}

export function presentPublicProfile(profile, user, { detail = false } = {}) {
  const primary = getPrimaryPhoto(profile);
  const enriched = enrichProfile(pick(profile, PUBLIC_FIELDS), user);
  const publicProfile = {
    ...enriched,
    primaryPhotoData: primary?.data || "",
    photoCount: Array.isArray(profile?.photos) ? profile.photos.length : 0
  };
  if (!detail) delete publicProfile.about;
  delete publicProfile.profileMissing;
  delete publicProfile.trustChecks;
  return publicProfile;
}

export function presentOwnerProfile(profile, user) {
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];
  const primary = getPrimaryPhoto(profile);
  return enrichProfile({ ...profile, photos, primaryPhotoData: primary?.data || "" }, user);
}
