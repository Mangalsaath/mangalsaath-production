import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOTAL = 1005;
const REFRESH_BASELINE = process.env.REFRESH_SYNTHETIC_DEMO_BASELINE === "YES";

if (process.env.ALLOW_SYNTHETIC_DEMO_SEED !== "true") {
  console.error("Synthetic demo seed is disabled. Set ALLOW_SYNTHETIC_DEMO_SEED=true to continue.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.CONFIRM_CONTROLLED_DEMO_SEED !== "YES") {
  console.error("Production synthetic demo seed requires CONFIRM_CONTROLLED_DEMO_SEED=YES.");
  process.exit(1);
}

const locations = [
  ["Delhi", "Delhi"], ["Mumbai", "Maharashtra"], ["Pune", "Maharashtra"],
  ["Bengaluru", "Karnataka"], ["Chennai", "Tamil Nadu"], ["Hyderabad", "Telangana"],
  ["Kolkata", "West Bengal"], ["Ahmedabad", "Gujarat"], ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"], ["Noida", "Uttar Pradesh"], ["Ghaziabad", "Uttar Pradesh"],
  ["Chandigarh", "Chandigarh"], ["Ludhiana", "Punjab"], ["Amritsar", "Punjab"],
  ["Kochi", "Kerala"], ["Bhopal", "Madhya Pradesh"], ["Indore", "Madhya Pradesh"],
  ["Patna", "Bihar"], ["Bhubaneswar", "Odisha"], ["Guwahati", "Assam"],
  ["Dehradun", "Uttarakhand"], ["Ranchi", "Jharkhand"], ["Raipur", "Chhattisgarh"],
  ["Surat", "Gujarat"], ["Vadodara", "Gujarat"], ["Nagpur", "Maharashtra"],
];

const religionProfiles = [
  {
    religion: "Hindu", weight: 65,
    communities: ["Brahmin", "Rajput", "Agarwal", "Khatri", "Arora", "Jat", "Kayastha", "Yadav", "Maratha", "Nair", "Reddy", "Patel", "Iyer", "Lingayat"],
    surnames: ["Sharma", "Singh", "Gupta", "Mehta", "Kapoor", "Verma", "Joshi", "Patel", "Reddy", "Nair", "Iyer", "Kulkarni", "Rao", "Yadav"],
  },
  {
    religion: "Muslim", weight: 12,
    communities: ["Sunni", "Shia", "Sheikh", "Syed", "Pathan", "Ansari", "Qureshi"],
    surnames: ["Khan", "Siddiqui", "Sheikh", "Ansari", "Qureshi", "Mirza", "Syed"],
  },
  {
    religion: "Sikh", weight: 10,
    communities: ["Jat Sikh", "Khatri Sikh", "Arora Sikh", "Ramgarhia", "Saini Sikh"],
    surnames: ["Singh", "Kaur", "Gill", "Sandhu", "Dhillon", "Grewal", "Bedi", "Sethi"],
  },
  {
    religion: "Christian", weight: 8,
    communities: ["Roman Catholic", "Catholic", "Syrian Christian", "Protestant", "Pentecostal"],
    surnames: ["Thomas", "D'Souza", "Joseph", "George", "Fernandes", "Mathew", "Varghese"],
  },
  {
    religion: "Jain", weight: 5,
    communities: ["Digambar", "Shwetambar", "Oswal Jain", "Agarwal Jain", "Porwal Jain"],
    surnames: ["Jain", "Shah", "Mehta", "Bhandari", "Kothari", "Oswal"],
  },
];

const maleNames = ["Aarav", "Vivaan", "Aditya", "Arjun", "Kabir", "Ishaan", "Rohan", "Karan", "Nikhil", "Samar", "Manav", "Dhruv", "Varun", "Yash", "Aman", "Harpreet", "Gurpreet", "Rehan", "Ayaan", "Neil"];
const femaleNames = ["Aanya", "Diya", "Anika", "Meera", "Ira", "Kavya", "Riya", "Naina", "Simran", "Tanya", "Ishita", "Neha", "Aditi", "Sanya", "Pooja", "Maya", "Harleen", "Noor", "Sara", "Maria"];
const education = ["B.Tech / B.E.", "MBA / PGDM", "B.Com.", "B.A.", "B.Sc.", "M.Com.", "M.A.", "M.Sc.", "MCA", "MBBS", "MD / MS", "CA", "LLB", "PhD", "Diploma / Professional Qualification"];
const professions = ["Software Professional", "Engineer", "Doctor", "Business Owner", "Consultant", "Manager", "Banking Professional", "Chartered Accountant", "Lawyer", "Teacher / Professor", "Government Employee", "Finance Professional", "Self Employed", "Family Business", "Architect", "Healthcare Professional"];
const incomes = ["Not earning / Student", "3–5 LPA", "5–8 LPA", "8–12 LPA", "12–18 LPA", "18–25 LPA", "25–35 LPA", "35–50 LPA", "50–75 LPA", "75 LPA–1 Cr", "1 Cr+"];
const maritalStatuses = ["Never Married", "Never Married", "Never Married", "Never Married", "Divorced", "Widowed"];

function pick(items, index, salt = 0) {
  return items[(index * 7 + salt * 13) % items.length];
}

function religionFor(index) {
  const bucket = (index * 37 + 11) % 100;
  let running = 0;
  for (const item of religionProfiles) {
    running += item.weight;
    if (bucket < running) return item;
  }
  return religionProfiles[0];
}

function galleryAsset(name, index, gender, slot) {
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const hue = (index * 37 + slot * 29 + (gender === "Male" ? 12 : 205)) % 360;
  const labels = ["Portrait", "Formal", "Traditional", "Lifestyle", "Close-up"];
  const cx = 300 + ((slot % 3) - 1) * 22;
  const cy = 235 + (slot % 2) * 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue} 42% 84%)"/><stop offset="1" stop-color="hsl(${(hue + 42) % 360} 45% 62%)"/></linearGradient></defs><rect width="640" height="800" rx="48" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="116" fill="rgba(255,255,255,.78)"/><path d="M105 690c18-170 104-266 215-266s197 96 215 266" fill="rgba(255,255,255,.74)"/><rect x="34" y="710" width="572" height="58" rx="18" fill="rgba(255,255,255,.75)"/><text x="320" y="748" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="rgba(45,30,35,.78)">${initials} · ${labels[slot - 1]}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function build(index) {
  const sequence = index + 1;
  const gender = sequence <= 500 ? "Male" : sequence <= 1000 ? "Female" : sequence % 2 ? "Male" : "Female";
  const religionProfile = religionFor(index);
  const religion = religionProfile.religion;
  const firstName = pick(gender === "Male" ? maleNames : femaleNames, index, religion.length);
  let lastName = pick(religionProfile.surnames, index, 2);
  if (religion === "Sikh") lastName = gender === "Female" ? "Kaur" : "Singh";
  const name = `${firstName} ${lastName}`;
  const community = pick(religionProfile.communities, index, 7);
  const [city, state] = pick(locations, index, 3);
  const age = 23 + ((index * 5) % 17);
  const year = 2026 - age;
  const month = String(1 + ((index * 3) % 12)).padStart(2, "0");
  const day = String(1 + ((index * 11) % 27)).padStart(2, "0");
  const dateOfBirth = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const id = String(sequence).padStart(4, "0");
  const userId = `demo_user_${id}`;
  const profileId = `demo_profile_${id}`;
  const profession = pick(professions, index, 5);
  const qualification = pick(education, index, 8);
  const annualCtc = pick(incomes, index, 9);
  const photos = Array.from({ length: 5 }, (_, offset) => {
    const slot = offset + 1;
    return {
      id: `demo_photo_${id}_${slot}`,
      data: galleryAsset(name, index, gender, slot),
      mime: "image/svg+xml",
      createdAt: new Date().toISOString(),
      syntheticSlot: slot,
      purpose: ["portrait", "formal", "traditional", "lifestyle", "close-up"][offset],
    };
  });
  const about = `${firstName} is a fictional demonstration member profile created for controlled Mangalsaath evaluation. ${firstName} is a ${profession.toLowerCase()} based in ${city}, with ${qualification} education, family-oriented values and a balanced approach to finding a compatible life partner.`;

  return {
    user: {
      id: userId,
      username: `demo_${id}`,
      firstName,
      lastName,
      email: `demo_${id}@example.invalid`,
      mobile: `demo_${id}`,
      passwordHash: "!synthetic-demo-no-login!",
      role: "member",
      status: "active",
      city,
      profession,
      membership: sequence % 5 === 0 ? "Premium" : "Free",
      membershipPlanId: sequence % 5 === 0 ? "premium" : "free",
      mobileVerified: true,
      mobileVerificationStatus: "verified",
      mobileVerificationMethod: "controlled-demo",
      emailVerified: true,
      verified: true,
      approvalStatus: "approved",
      approvalReason: "Controlled synthetic demo profile",
      mustChangePassword: false,
    },
    profile: {
      id: profileId,
      userId,
      name,
      gender,
      dateOfBirth,
      placeOfBirth: city,
      timeOfBirth: `${String(6 + (index % 12)).padStart(2, "0")}:${index % 2 ? "30" : "15"}`,
      age,
      maritalStatus: pick(maritalStatuses, index, 6),
      height: gender === "Male" ? 164 + (index % 24) : 151 + (index % 22),
      religion,
      caste: community,
      subCaste: religion === "Hindu" ? pick(["Open", "General", "Not specified"], index, 10) : "Not applicable",
      gotra: religion === "Hindu" ? pick(["Not specified", "Kashyap", "Bharadwaj", "Vashishtha", "Gautam"], index, 11) : "Not applicable",
      education: qualification,
      profession,
      annualCtc,
      brothersMarried: index % 3 === 0 ? 1 : 0,
      brothersUnmarried: index % 4 === 0 ? 1 : 0,
      sistersMarried: index % 5 === 0 ? 1 : 0,
      sistersUnmarried: index % 6 === 0 ? 1 : 0,
      country: "India",
      state,
      city,
      about,
      partnerAgeMin: Math.max(18, age - (gender === "Male" ? 6 : 2)),
      partnerAgeMax: Math.min(60, age + (gender === "Male" ? 2 : 6)),
      partnerReligion: religion,
      partnerCaste: "Open",
      partnerLocation: "India",
      partnerMaritalStatus: "Open",
      partnerEducation: "Open",
      partnerProfession: "Open",
      photos,
      primaryPhoto: photos[0].id,
      photoModerationStatus: "approved",
      photoModerationNote: "Controlled synthetic demo gallery asset",
      score: 60 + (index % 36),
      verified: true,
      verificationStatus: "approved",
      trustedProfile: true,
      initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
      isDemoProfile: true,
      demoVisible: false,
      demoVisibleFrom: null,
      demoVisibleUntil: null,
      demoCreatedBy: "system_demo_seed",
      demoLabel: "Synthetic demo profile",
    },
  };
}

function profileRefreshData(profile) {
  const { id, userId, isDemoProfile, demoVisible, demoVisibleFrom, demoVisibleUntil, demoCreatedBy, demoLabel, ...safe } = profile;
  return safe;
}

async function seedOne(index) {
  const record = build(index);
  const existing = await prisma.memberProfile.findUnique({ where: { id: record.profile.id }, select: { id: true } });

  await prisma.user.upsert({
    where: { id: record.user.id },
    create: record.user,
    update: REFRESH_BASELINE ? {
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      city: record.user.city,
      profession: record.user.profession,
    } : {},
  });

  if (!existing) {
    await prisma.memberProfile.create({ data: record.profile });
    return;
  }

  const galleryOnly = {
    photos: record.profile.photos,
    primaryPhoto: record.profile.primaryPhoto,
    photoModerationStatus: "approved",
    photoModerationNote: "Controlled synthetic demo gallery asset",
  };

  await prisma.memberProfile.update({
    where: { id: record.profile.id },
    data: REFRESH_BASELINE ? { ...profileRefreshData(record.profile), ...galleryOnly } : galleryOnly,
  });
}

async function main() {
  console.log(`Preparing ${TOTAL} controlled synthetic demo profiles with five-photo galleries...`);
  console.log(`Baseline demographic refresh: ${REFRESH_BASELINE ? "ENABLED" : "disabled (gallery-only for existing profiles)"}`);
  for (let start = 0; start < TOTAL; start += 25) {
    const end = Math.min(TOTAL, start + 25);
    await Promise.all(Array.from({ length: end - start }, (_, offset) => seedOne(start + offset)));
    console.log(`Processed ${end}/${TOTAL}`);
  }
  const count = await prisma.memberProfile.count({ where: { isDemoProfile: true } });
  console.log(`Controlled synthetic demo profiles present: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
