const ESSENTIAL_FIELDS = [
  ["name", "Full name", 8],
  ["gender", "Gender", 5],
  ["dateOfBirth", "Date of birth", 6],
  ["maritalStatus", "Marital status", 6],
  ["height", "Height", 5],
  ["religion", "Religion", 6],
  ["caste", "Caste / community", 5],
  ["education", "Education", 7],
  ["profession", "Profession", 7],
  ["annualCtc", "Annual CTC / income", 4],
  ["country", "Country", 4],
  ["state", "State", 4],
  ["city", "City", 5],
  ["about", "About me", 10],
  ["partnerAgeMin", "Partner age range", 4],
  ["partnerAgeMax", "Partner age range", 4],
  ["partnerReligion", "Partner religion", 3],
  ["partnerLocation", "Partner location", 3],
  ["photos", "Profile photo", 7]
];

function hasValue(profile, key) {
  if (key === "photos") return Array.isArray(profile?.photos) && profile.photos.length > 0;
  return String(profile?.[key] ?? "").trim().length > 0;
}

export function calculateProfileCompletion(profile) {
  if (!profile) return { percent: 0, missing: ESSENTIAL_FIELDS.map(([, label]) => label), completedWeight: 0, totalWeight: 100 };
  const totalWeight = ESSENTIAL_FIELDS.reduce((sum, [, , weight]) => sum + weight, 0);
  const completedWeight = ESSENTIAL_FIELDS.reduce((sum, [key, , weight]) => sum + (hasValue(profile, key) ? weight : 0), 0);
  const missing = ESSENTIAL_FIELDS.filter(([key]) => !hasValue(profile, key)).map(([, label]) => label).filter((label, index, list) => list.indexOf(label) === index);
  return { percent: Math.round((completedWeight / totalWeight) * 100), missing, completedWeight, totalWeight };
}

export function calculateTrustScore(profile, user) {
  const completion = calculateProfileCompletion(profile).percent;
  const checks = {
    mobileVerified: Boolean(user?.mobileVerified || user?.verified),
    emailVerified: Boolean(user?.emailVerified),
    hasApprovedPhoto: Boolean((profile?.photos || []).length && profile?.photoModerationStatus === "approved"),
    adminReviewed: Boolean(profile?.verificationStatus === "approved" || user?.verified),
    profileComplete: completion >= 80
  };
  const score = Math.min(100,
    Math.round(completion * 0.45) +
    (checks.mobileVerified ? 15 : 0) +
    (checks.emailVerified ? 10 : 0) +
    (checks.hasApprovedPhoto ? 10 : 0) +
    (checks.adminReviewed ? 15 : 0) +
    (checks.profileComplete ? 5 : 0)
  );
  const level = score >= 85 ? "High" : score >= 60 ? "Growing" : "Basic";
  return { score, level, checks };
}

export function enrichProfile(profile, user) {
  const completion = calculateProfileCompletion(profile);
  const trust = calculateTrustScore(profile, user);
  return { ...profile, profileCompletion: completion.percent, profileMissing: completion.missing, trustScore: trust.score, trustLevel: trust.level, trustChecks: trust.checks };
}
