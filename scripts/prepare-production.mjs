import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date();
const uid = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const stateSeed = {
  users: [], profiles: [], sessions: [], interests: [], messages: [], notifications: [], activities: [],
  subscriptions: [], transactions: [], usage: [], verificationAudits: [], otpChallenges: [],
  pendingRegistrations: [], passwordResetChallenges: [], adminAuthChallenges: [], adminAuditLogs: [],
  blocks: [], reports: [],
  homepageOffers: [{
    id: 'offer_founding', title: 'Founding Member Offer',
    subtitle: 'Save 20% on Premium and Platinum membership', badge: 'LIMITED-TIME OFFER',
    couponCode: 'PREMIER', discountType: 'percentage', discountValue: 20,
    buttonText: 'View Plans', buttonTarget: 'membership', theme: 'rose', priority: 1,
    status: 'approved', active: true, startAt: null, endAt: null,
    createdAt: now.toISOString(), updatedAt: now.toISOString()
  }],
  analytics: { totalVisits: 0, uniqueVisitors: 0, daily: {}, visitors: {} },
  settings: {
    businessName: 'MangalSaath', businessAddress: '', gstin: '',
    supportEmail: 'support@mangalsaath.com',
    supportMobile: '', whatsapp: '', upiId: '', qrImage: '/payment-qr.png',
    paymentInstructions: 'Pay using any UPI app, enter the UTR and submit for administrator verification.',
    footerCopyright: `© ${now.getFullYear()} MangalSaath. All rights reserved.`,
    maintenanceMode: false, registrationEnabled: true,
    superAdminEmail: String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    superAdminMobile: String(process.env.ADMIN_MOBILE || '').replace(/\D/g, '').slice(-10),
    adminOtpExpiryMinutes: 5, adminSessionMinutes: 30
  },
  coupons: [{
    id: 'coupon_premier', code: 'PREMIER', discountType: 'percentage', discountValue: 20,
    startAt: null, endAt: null, maxUses: 0, usesPerUser: 1,
    applicablePlanIds: ['premium', 'platinum'], active: true, createdAt: now.toISOString()
  }],
  plans: [
    { id: 'free', name: 'Free', price: 0, durationDays: 0, active: true, features: { profileViews: 50, interests: 5, messages: 20, advancedSearch: false, priority: false } },
    { id: 'premium', name: 'Premium', price: 1499, durationDays: 180, active: true, features: { profileViews: -1, interests: -1, messages: -1, advancedSearch: true, priority: true } },
    { id: 'platinum', name: 'Platinum', price: 2499, durationDays: 365, active: true, features: { profileViews: -1, interests: -1, messages: -1, advancedSearch: true, priority: true } }
  ]
};

async function seedState() {
  const existing = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.applicationState.create({ data: { id: 1, payload: stateSeed } });
    console.log('Created application state.');
    return;
  }
  const payload = existing.payload && typeof existing.payload === 'object' ? existing.payload : {};
  const settings = { ...(payload.settings || {}) };
  if (process.env.ADMIN_EMAIL) settings.superAdminEmail = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
  if (process.env.ADMIN_MOBILE) settings.superAdminMobile = String(process.env.ADMIN_MOBILE).replace(/\D/g, '').slice(-10);
  await prisma.applicationState.update({
    where: { id: 1 },
    data: { payload: { ...stateSeed, ...payload, settings: { ...stateSeed.settings, ...settings } } }
  });
  console.log('Verified application state.');
}

const planDefinitions = [
  { id: 'free', slug: 'free', name: 'Free', description: 'Create a profile and explore MangalSaath.', pricePaise: 0, durationDays: 0, displayOrder: 1 },
  { id: 'premium', slug: 'premium', name: 'Premium', description: 'Unlimited connections for six months.', pricePaise: 149900, durationDays: 180, displayOrder: 2, badge: 'POPULAR' },
  { id: 'platinum', slug: 'platinum', name: 'Platinum', description: 'Priority membership for one year.', pricePaise: 249900, durationDays: 365, displayOrder: 3, badge: 'BEST VALUE' }
];
const features = {
  free: { profileViews: 50, interests: 5, messages: 20, advancedSearch: 0, priority: 0 },
  premium: { profileViews: -1, interests: -1, messages: -1, advancedSearch: 1, priority: 1 },
  platinum: { profileViews: -1, interests: -1, messages: -1, advancedSearch: 1, priority: 1 }
};

async function seedRelationalDefaults() {
  const defaultSettings = {
    businessName: 'MangalSaath',
    supportEmail: 'support@mangalsaath.com',
    upiId: '',
    qrImage: '/payment-qr.png',
    paymentInstructions: 'Pay by UPI and submit the UTR for verification.',
    seoTitle: 'MangalSaath | Meaningful Matches, Trusted Beginnings',
    seoDescription: 'A privacy-first Indian matrimonial platform for meaningful, family-trusted connections.'
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    const category = /upi|qr|payment/i.test(key) ? 'payment' : /seo/i.test(key) ? 'content' : /email/i.test(key) ? 'contact' : 'business';
    await prisma.businessSetting.upsert({
      where: { key },
      create: { id: uid('setting'), key, category, value },
      update: {}
    });
  }

  for (const plan of planDefinitions) {
    await prisma.membershipPlan.upsert({ where: { id: plan.id }, create: { ...plan, active: true }, update: { ...plan, active: true } });
    for (const [permissionKey, numericLimit] of Object.entries(features[plan.id])) {
      await prisma.planFeature.upsert({
        where: { planId_permissionKey: { planId: plan.id, permissionKey } },
        create: { id: uid('feature'), planId: plan.id, permissionKey, enabled: numericLimit !== 0, numericLimit },
        update: { enabled: numericLimit !== 0, numericLimit }
      });
    }
  }
  await prisma.coupon.upsert({
    where: { code: 'PREMIER' },
    create: { id: 'coupon_premier', code: 'PREMIER', discountType: 'percentage', discountValue: 20, maxUses: 0, usesPerUser: 1, active: true },
    update: { discountType: 'percentage', discountValue: 20, active: true }
  });
  for (const planId of ['premium', 'platinum']) {
    await prisma.couponPlan.upsert({
      where: { couponId_planId: { couponId: 'coupon_premier', planId } },
      create: { couponId: 'coupon_premier', planId }, update: {}
    });
  }
  console.log('Verified membership plans and coupon.');
}

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const mobile = String(process.env.ADMIN_MOBILE || '').replace(/\D/g, '').slice(-10);
  const username = String(process.env.ADMIN_USERNAME || 'superadmin').trim().toLowerCase();
  const firstName = String(process.env.ADMIN_FIRST_NAME || 'Super').trim();
  const lastName = String(process.env.ADMIN_LAST_NAME || 'Admin').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const resetPassword = String(process.env.ADMIN_RESET_PASSWORD || '').toLowerCase() === 'true';

  // Preserve the existing Super Admin across ordinary deployments and migrate
  // the legacy `admin` role to the dedicated `super_admin` role required by
  // privileged controls introduced in v6.9.0.
  const existingAdmin = await prisma.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] } },
    orderBy: { createdAt: 'asc' }
  });

  if (existingAdmin) {
    const data = {};
    if (username) data.username = username;
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (email) {
      if (!email.includes('@')) throw new Error('ADMIN_EMAIL must be a valid email address.');
      data.email = email;
    }
    if (mobile) {
      if (!/^\d{10}$/.test(mobile)) throw new Error('ADMIN_MOBILE must contain a valid 10-digit Indian mobile number.');
      data.mobile = mobile;
    }
    data.role = 'super_admin';
    data.status = 'active';
    data.mobileVerified = true;
    data.emailVerified = true;
    data.verified = true;

    if (resetPassword) {
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters when ADMIN_RESET_PASSWORD=true.');
      data.passwordHash = hashPassword(password);
      data.mustChangePassword = true;
      data.passwordChangedAt = new Date();
    }

    await prisma.user.update({ where: { id: existingAdmin.id }, data });
    console.log(`Verified Super Admin: ${data.email || existingAdmin.email}${resetPassword ? ' (temporary password reset)' : ''}`);
    return;
  }

  // First installation: all bootstrap credentials are mandatory.
  if (!email) throw new Error('ADMIN_EMAIL is required to create the first Super Admin.');
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL must be a valid email address.');
  if (!/^\d{10}$/.test(mobile)) throw new Error('ADMIN_MOBILE must contain a valid 10-digit Indian mobile number.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');

  const identityConflict = await prisma.user.findFirst({
    where: { OR: [{ email }, { mobile }, { username }] }
  });
  if (identityConflict) {
    throw new Error('The configured Super Admin email, mobile or username is already assigned to a non-admin account.');
  }

  await prisma.user.create({
    data: {
      id: uid('admin'), username, firstName, lastName, email, mobile,
      passwordHash: hashPassword(password), role: 'super_admin', status: 'active',
      mobileVerified: true, emailVerified: true, verified: true,
      membership: 'Free', membershipPlanId: 'free', mustChangePassword: true,
      passwordChangedAt: new Date()
    }
  });
  console.log(`Created Super Admin: ${email}`);
}

try {
  await seedState();
  await seedRelationalDefaults();
  await seedAdmin();
  console.log('Production preparation complete.');
} finally {
  await prisma.$disconnect();
}
