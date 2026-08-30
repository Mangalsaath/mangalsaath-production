import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOTAL = 1005;

if (process.env.ALLOW_SYNTHETIC_DEMO_SEED !== "true") {
  console.error("Synthetic demo seed is disabled. Set ALLOW_SYNTHETIC_DEMO_SEED=true to continue.");
  process.exit(1);
}
if (
  process.env.NODE_ENV === "production" &&
  process.env.CONFIRM_CONTROLLED_DEMO_SEED !== "YES"
) {
  console.error(
    "Production synthetic demo seed requires CONFIRM_CONTROLLED_DEMO_SEED=YES.",
  );
  process.exit(1);
}

const maleNames = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Reyansh", "Kabir", "Ishaan", "Rohan",
  "Karan", "Nikhil", "Samar", "Manav", "Dhruv", "Varun", "Yash", "Aman",
];
const femaleNames = [
  "Aanya", "Diya", "Anika", "Meera", "Ira", "Kavya", "Riya", "Naina",
  "Simran", "Tanya", "Ishita", "Neha", "Aditi", "Sanya", "Pooja", "Maya",
];
const surnames = [
  "Sharma", "Verma", "Singh", "Mehta", "Kapoor", "Gupta", "Iyer", "Nair",
  "Reddy", "Patel", "Joshi", "Bose", "Das", "Khan", "Siddiqui", "Gill",
  "Kaur", "Thomas", "D'Souza", "Jain", "Chopra", "Malhotra", "Kulkarni", "Rao",
];
const locations = [
  ["Delhi", "Delhi"], ["Mumbai", "Maharashtra"], ["Pune", "Maharashtra"],
  ["Bengaluru", "Karnataka"], ["Chennai", "Tamil Nadu"], ["Hyderabad", "Telangana"],
  ["Kolkata", "West Bengal"], ["Ahmedabad", "Gujarat"], ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"], ["Noida", "Uttar Pradesh"], ["Ghaziabad", "Uttar Pradesh"],
  ["Chandigarh", "Chandigarh"], ["Ludhiana", "Punjab"], ["Kochi", "Kerala"],
  ["Bhopal", "Madhya Pradesh"], ["Indore", "Madhya Pradesh"], ["Patna", "Bihar"],
  ["Bhubaneswar", "Odisha"], ["Guwahati", "Assam"], ["Dehradun", "Uttarakhand"],
  ["Ranchi", "Jharkhand"], ["Raipur", "Chhattisgarh"], ["Panaji", "Goa"],
];
const religions = ["Hindu", "Muslim", "Sikh", "Christian", "Jain", "Buddhist", "Parsi", "No Religion"];
const castes = ["Open / No preference", "Brahmin", "Rajput", "Khatri", "Arora", "Jat", "Agarwal", "Kayastha", "Reddy", "Nair", "Maratha", "Other"];
const education = [
  "B.Tech / B.E.", "MBA / PGDM", "M.Sc.", "M.Com.", "B.A.", "B.Com.",
  "MBBS", "MD / MS", "CA", "LLB", "MCA", "PhD", "Post Graduate",
];
const professions = [
  "Software Professional", "Engineer", "Doctor", "Business Owner", "Consultant",
  "Manager", "Banking Professional", "Chartered Accountant", "Lawyer",
  "Teacher / Professor", "Government Employee", "Finance Professional", "Self Employed",
];
const maritalStatuses = ["Never Married", "Never Married", "Never Married", "Divorced", "Widowed"];
const ctc = ["6–8 LPA", "8–12 LPA", "12–18 LPA", "18–25 LPA", "25–35 LPA", "35+ LPA"];

function pick(items, index, salt = 0) {
  return items[(index * 7 + salt * 13) % items.length];
}

function svgAvatar(name, index, gender) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const hue = (index * 37 + (gender === "Male" ? 15 : 210)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue} 42% 78%)"/><stop offset="1" stop-color="hsl(${(hue + 38) % 360} 45% 58%)"/></linearGradient></defs><rect width="640" height="640" rx="64" fill="url(#g)"/><circle cx="320" cy="245" r="112" fill="rgba(255,255,255,.72)"/><path d="M120 610c16-142 96-220 200-220s184 78 200 220" fill="rgba(255,255,255,.72)"/><text x="320" y="590" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="rgba(40,25,30,.72)">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function build(index) {
  const sequence = index + 1;
  const gender = sequence <= 500 ? "Male" : sequence <= 1000 ? "Female" : sequence % 2 ? "Male" : "Female";
  const firstName = pick(gender === "Male" ? maleNames : femaleNames, index, 1);
  const lastName = pick(surnames, index, 2);
  const name = `${firstName} ${lastName}`;
  const [city, state] = pick(locations, index, 3);
  const religion = pick(religions, index, 4);
  const age = 23 + ((index * 5) % 17);
  const year = 2026 - age;
  const month = String(1 + ((index * 3) % 12)).padStart(2, "0");
  const day = String(1 + ((index * 11) % 27)).padStart(2, "0");
  const dateOfBirth = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const id = String(sequence).padStart(4, "0");
  const userId = `demo_user_${id}`;
  const profileId = `demo_profile_${id}`;
  const photoId = `demo_photo_${id}`;
  const about = `${firstName} is a fictional demonstration member profile created for controlled Mangalsaath client evaluation. The profile represents a ${pick(professions, index, 5).toLowerCase()} based in ${city}, with family-oriented values, balanced interests and an open-minded approach to finding a compatible life partner.`;

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
      profession: pick(professions, index, 5),
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
      caste: pick(castes, index, 7),
      subCaste: "Open",
      gotra: "Not specified",
      education: pick(education, index, 8),
      profession: pick(professions, index, 5),
      annualCtc: pick(ctc, index, 9),
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
      partnerReligion: "Open",
      partnerCaste: "Open",
      partnerLocation: "India",
      partnerMaritalStatus: "Open",
      partnerEducation: "Open",
      partnerProfession: "Open",
      photos: [{ id: photoId, data: svgAvatar(name, index, gender), mime: "image/svg+xml", createdAt: new Date().toISOString() }],
      primaryPhoto: photoId,
      photoModerationStatus: "approved",
      photoModerationNote: "Controlled synthetic demo asset",
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

async function seedOne(index) {
  const record = build(index);
  await prisma.user.upsert({
    where: { id: record.user.id },
    create: record.user,
    update: record.user,
  });
  await prisma.memberProfile.upsert({
    where: { id: record.profile.id },
    create: record.profile,
    update: record.profile,
  });
}

async function main() {
  console.log(`Seeding ${TOTAL} controlled synthetic demo profiles (hidden by default)...`);
  for (let start = 0; start < TOTAL; start += 25) {
    const end = Math.min(TOTAL, start + 25);
    await Promise.all(Array.from({ length: end - start }, (_, offset) => seedOne(start + offset)));
    console.log(`Seeded ${end}/${TOTAL}`);
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
