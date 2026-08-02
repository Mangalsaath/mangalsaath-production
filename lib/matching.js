function text(value) {
  return String(value || "").trim().toLowerCase();
}

function containsPreference(preference, actual) {
  const wanted = text(preference);
  if (!wanted || wanted === "any" || wanted === "open") return null;
  return text(actual).includes(wanted);
}

export function calculateCompatibility(viewerProfile, candidateProfile) {
  if (!viewerProfile) {
    const fallback = Math.max(50, Math.min(95, Number(candidateProfile?.score) || 70));
    return { score: fallback, reasons: ["Profile meets MangalSaath publishing standards"] };
  }

  let earned = 0;
  let available = 0;
  const reasons = [];
  const add = (weight, matched, reason) => {
    if (matched === null) return;
    available += weight;
    if (matched) {
      earned += weight;
      if (reason) reasons.push(reason);
    }
  };

  const age = Number(candidateProfile?.age);
  const minAge = Number(viewerProfile.partnerAgeMin) || 18;
  const maxAge = Number(viewerProfile.partnerAgeMax) || 60;
  add(25, Number.isFinite(age) && age >= minAge && age <= maxAge, "Age is within your preferred range");
  add(20, containsPreference(viewerProfile.partnerReligion, candidateProfile?.religion), "Religion matches your preference");
  add(15, containsPreference(viewerProfile.partnerCaste, candidateProfile?.caste), "Caste matches your preference");
  add(10, containsPreference(viewerProfile.partnerLocation, `${candidateProfile?.city || ""} ${candidateProfile?.state || ""} ${candidateProfile?.country || ""}`), "Location matches your preference");
  add(10, containsPreference(viewerProfile.partnerEducation, candidateProfile?.education), "Education matches your preference");
  add(10, containsPreference(viewerProfile.partnerProfession, candidateProfile?.profession), "Profession matches your preference");
  add(5, containsPreference(viewerProfile.partnerMaritalStatus, candidateProfile?.maritalStatus), "Marital status matches your preference");

  available += 5;
  if (candidateProfile?.verified || candidateProfile?.trustedProfile) {
    earned += 5;
    reasons.push("Profile has trust verification");
  }

  const score = available ? Math.round((earned / available) * 100) : 70;
  return { score: Math.max(35, Math.min(99, score)), reasons: reasons.slice(0, 4) };
}
