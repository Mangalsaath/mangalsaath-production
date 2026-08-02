import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { relationalAuthEnabled, createRelationalSession, getRelationalSession, revokeRelationalSession } from "@/lib/relational-auth";
import { getSystemSettings } from "@/lib/settings-service";
import { isAdminRole } from "@/lib/roles";

export { prisma };

const seed = {
  users: [],
  profiles: [],
  sessions: [],
  interests: [],
  messages: [],
  notifications: [],
  activities: [],
  subscriptions: [],
  transactions: [],
  usage: [],
  verificationAudits: [],
  otpChallenges: [],
  pendingRegistrations: [],
  passwordResetChallenges: [],
  adminAuthChallenges: [],
  adminAuditLogs: [],
  blocks: [],
  reports: [],
  homepageOffers: [
    {id:"offer_founding",title:"Founding Member Offer",subtitle:"Save 20% on Premium and Platinum membership",badge:"LIMITED-TIME OFFER",couponCode:"PREMIER",discountType:"percentage",discountValue:20,buttonText:"View Plans",buttonTarget:"membership",theme:"rose",priority:1,status:"approved",active:true,startAt:null,endAt:null,createdAt:"2026-07-01T00:00:00.000Z",updatedAt:"2026-07-01T00:00:00.000Z"}
  ],
  analytics: { totalVisits:0, uniqueVisitors:0, daily:{}, visitors:{} },
  settings: {
    businessName: "M/s Tradewave Enterprises",
    businessAddress: "Ghaziabad, Uttar Pradesh – 201009",
    gstin: "09KKIPS7473B1ZJ",
    supportEmail: "contact@mangalsaath.com",
    supportMobile: "+91 7988663797",
    whatsapp: "",
    upiId: "",
    qrImage: "/payment-qr.png",
    paymentInstructions: "Pay using any UPI app, enter the UTR and submit for administrator verification.",
    footerCopyright: "© 2026 Mangalsaath. All rights reserved.",
    maintenanceMode: false,
    registrationEnabled: true,
    superAdminEmail: "",
    superAdminMobile: "",
    adminOtpExpiryMinutes: 5,
    adminSessionMinutes: 30
  },
  coupons: [
    {id:"coupon_premier",code:"PREMIER",discountType:"percentage",discountValue:20,startAt:null,endAt:null,maxUses:0,usesPerUser:1,applicablePlanIds:["premium","platinum"],active:true,createdAt:"2026-07-01T00:00:00.000Z"}
  ],
  plans: [
    {id:"free",name:"Free",price:0,durationDays:0,active:true,features:{profileViews:50,interests:5,messages:20,advancedSearch:false,priority:false}},
    {id:"premium",name:"Premium",price:1499,durationDays:180,active:true,features:{profileViews:-1,interests:-1,messages:-1,advancedSearch:true,priority:true}},
    {id:"platinum",name:"Platinum",price:2499,durationDays:365,active:true,features:{profileViews:-1,interests:-1,messages:-1,advancedSearch:true,priority:true}}
  ]
};

const STATE_VERSION = Symbol.for("mangalsaath.applicationStateVersion");

let operationQueue = Promise.resolve();
function serialized(operation) {
  const next = operationQueue.then(operation, operation);
  operationQueue = next.catch(() => undefined);
  return next;
}

function normalizeDb(input) {
  const db = input && typeof input === "object" ? structuredClone(input) : structuredClone(seed);
  for (const key of ["users","profiles","sessions","interests","messages","notifications","activities","subscriptions","transactions","usage","plans","verificationAudits","otpChallenges","pendingRegistrations","passwordResetChallenges","adminAuthChallenges","adminAuditLogs","blocks","reports","coupons","homepageOffers"]) {
    if (!Array.isArray(db[key])) db[key] = [];
  }
  if (!db.plans.length) db.plans = structuredClone(seed.plans);
  db.settings = { ...structuredClone(seed.settings), ...(db.settings || {}) };
  if (!db.coupons.length) db.coupons = structuredClone(seed.coupons);
  if (!db.homepageOffers.length) db.homepageOffers = structuredClone(seed.homepageOffers);
  db.analytics = { ...structuredClone(seed.analytics), ...(db.analytics || {}) };
  db.analytics.daily = db.analytics.daily && typeof db.analytics.daily === "object" ? db.analytics.daily : {};
  db.analytics.visitors = db.analytics.visitors && typeof db.analytics.visitors === "object" ? db.analytics.visitors : {};
  db.analytics.totalVisits = Number.isFinite(db.analytics.totalVisits) ? db.analytics.totalVisits : 0;
  db.analytics.uniqueVisitors = Number.isFinite(db.analytics.uniqueVisitors) ? db.analytics.uniqueVisitors : Object.keys(db.analytics.visitors).length;
  for (const u of db.users) { if (!u.membership) u.membership = "Free"; if (!u.membershipPlanId) u.membershipPlanId = "free"; }
  for (const m of db.messages) { if (typeof m.read !== "boolean") m.read = false; if (!m.updatedAt) m.updatedAt = m.createdAt; }
  for (const i of db.interests) { if (!i.updatedAt) i.updatedAt = i.createdAt; }
  return db;
}

async function addBootstrapAdmin(db) {
  // Production administrators must be created explicitly with:
  // ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
  // No default credentials or plaintext bootstrap files are accepted.
  return db;
}

async function ensureState() {
  const existing = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  const initial = await addBootstrapAdmin(normalizeDb(seed));
  return prisma.applicationState.create({ data: { id: 1, payload: initial } });
}

export async function readDb() {
  const state = await ensureState();
  const normalized = await addBootstrapAdmin(normalizeDb(state.payload));
  Object.defineProperty(normalized, STATE_VERSION, { value: state.version, enumerable: false, writable: false });
  return normalized;
}

export class DatabaseWriteConflictError extends Error {
  constructor() {
    super("The application data changed while this request was being processed. Please retry.");
    this.name = "DatabaseWriteConflictError";
    this.code = "DB_WRITE_CONFLICT";
  }
}

export async function writeDb(db) {
  const expectedVersion = Number(db?.[STATE_VERSION]);
  const normalized = normalizeDb(db);
  return serialized(async () => {
    if (Number.isInteger(expectedVersion)) {
      const result = await prisma.applicationState.updateMany({
        where: { id: 1, version: expectedVersion },
        data: { payload: normalized, version: { increment: 1 } }
      });
      if (result.count !== 1) throw new DatabaseWriteConflictError();
      return { version: expectedVersion + 1 };
    }
    return prisma.applicationState.upsert({
      where: { id: 1 },
      create: { id: 1, payload: normalized },
      update: { payload: normalized, version: { increment: 1 } }
    });
  });
}

export function isDatabaseWriteConflict(error) {
  return error?.code === "DB_WRITE_CONFLICT" || error instanceof DatabaseWriteConflictError;
}

export function uid(prefix){ return `${prefix}_${crypto.randomBytes(8).toString("hex")}`; }
export function hashPassword(password){ const salt=crypto.randomBytes(16).toString("hex"); const hash=crypto.scryptSync(String(password),salt,64).toString("hex"); return `${salt}:${hash}`; }
export function verifyPassword(password,storedHash){ if(!storedHash||!storedHash.includes(":"))return false; const [salt,expected]=storedHash.split(":"); const actual=crypto.scryptSync(String(password),salt,64); const expectedBuffer=Buffer.from(expected,"hex"); return expectedBuffer.length===actual.length&&crypto.timingSafeEqual(expectedBuffer,actual); }

function sessionTokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export async function createSession(userId, request = null, options = {}) {
  if (relationalAuthEnabled()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Unable to create session for unknown user.");
    const settings = await getSystemSettings();
    return createRelationalSession(user, request, { ...options, adminSessionMinutes: Number(settings.adminSessionMinutes || 30) });
  }
  const db = await readDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const user = db.users.find((item) => item.id === userId);
  const minutes = isAdminRole(user?.role) ? Number(db.settings?.adminSessionMinutes || 30) : 7 * 24 * 60;
  const active = db.sessions
    .filter((session) => session.userId === userId && new Date(session.expiresAt) > now)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  db.sessions = db.sessions.filter((session) => session.userId !== userId || active.some((keep) => keep.id === session.id || keep.tokenHash === session.tokenHash || keep.token === session.token));
  db.sessions.push({
    id: uid("session"),
    tokenHash: sessionTokenHash(token),
    userId,
    ip: request ? ((request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim().slice(0, 100)) : "",
    userAgent: request ? String(request.headers.get("user-agent") || "").slice(0, 300) : "",
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
    adminDualOtpVerified: isAdminRole(user?.role) ? options.adminDualOtpVerified === true : undefined
  });
  await writeDb(db);
  return token;
}

export async function getSession(request) {
  if (relationalAuthEnabled()) return getRelationalSession(request);
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const db = await readDb();
  const tokenHash = sessionTokenHash(token);
  const now = new Date();
  const session = db.sessions.find((item) => (item.tokenHash === tokenHash || item.token === token) && new Date(item.expiresAt) > now);
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId) || null;
  // Fail closed: every administrator session must originate from completed dual OTP.
  if (isAdminRole(user?.role) && session.adminDualOtpVerified !== true) return null;
  return { db, session, user, token };
}

export async function getUser(request) {
  const result = await getSession(request);
  return result?.user || null;
}

export async function revokeSession(request, allDevices = false) {
  if (relationalAuthEnabled()) return revokeRelationalSession(request, allDevices);
  const result = await getSession(request);
  if (!result?.user) return false;
  result.db.sessions = result.db.sessions.filter((item) => allDevices ? item.userId !== result.user.id : item.id !== result.session.id && item.tokenHash !== result.session.tokenHash && item.token !== result.token);
  await writeDb(result.db);
  return true;
}

export function calculateAge(dateOfBirth){ if(!dateOfBirth)return null; const dob=new Date(dateOfBirth); if(Number.isNaN(dob.getTime()))return null; const now=new Date(); let age=now.getFullYear()-dob.getFullYear(); const m=now.getMonth()-dob.getMonth(); if(m<0||(m===0&&now.getDate()<dob.getDate()))age--; return age; }

export function getMembership(db,userId){
 const user=db.users.find(u=>u.id===userId);
 const active=(db.subscriptions||[]).filter(s=>s.userId===userId&&s.status==="active"&&(!s.expiresAt||new Date(s.expiresAt)>new Date())).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
 const planId=active?.planId||user?.membershipPlanId||"free";
 const plan=(db.plans||[]).find(p=>p.id===planId&&p.active!==false)||(db.plans||[]).find(p=>p.id==="free");
 const month=new Date().toISOString().slice(0,7);
 let usage=(db.usage||[]).find(x=>x.userId===userId&&x.month===month);
 if(!usage){usage={id:uid("usage"),userId,month,profileViews:0,interests:0,messages:0};db.usage.push(usage);}
 return {user,active,plan,usage};
}
export function consumeFeature(db,userId,feature){
 const membership=getMembership(db,userId); const limit=membership.plan?.features?.[feature]??0; const used=membership.usage?.[feature]||0;
 if(limit!==-1&&used>=limit)return {allowed:false,...membership,limit,used};
 membership.usage[feature]=used+1; return {allowed:true,...membership,limit,used:used+1};
}
