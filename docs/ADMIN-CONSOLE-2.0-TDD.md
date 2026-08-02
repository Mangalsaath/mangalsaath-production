# MangalSaath Admin Console 2.0 — Technical Design Document

**Status:** Approved implementation baseline  
**Target:** MangalSaath v7.0 Launch Candidate  
**Source baseline:** v6.6.1  
**Design package:** v6.6.2

## 1. Objective

Build a secure, owner-operated business control center so routine platform operations do not require source-code changes. The launch version must cover dashboard visibility, member and photo moderation, business settings, plans, coupons, payments, homepage content, reports, security, and auditability.

## 2. Launch scope

### Included
- Admin dashboard and quick actions
- Member search, status changes and verification moderation
- Photo moderation queue
- Business, legal, support and SEO settings
- Membership plan and feature management
- Coupon management
- Payment and manual-payment review
- Homepage content management
- Reports and CSV export
- Admin audit log
- Super Admin dual-OTP settings
- Service-health summary based on application-owned checks

### Deferred
- Multi-tenant/franchise administration
- AI analytics
- WhatsApp automation
- Advanced accounting/refund automation
- Impersonation/login-as-member
- IP allowlisting UI

## 3. Existing-state gap analysis

### Existing and reusable
- Admin authentication and dual OTP
- Legacy dashboard API
- Legacy business settings, plans, coupons and homepage offers
- Member verification workflow
- Payment list and QR endpoints
- Audit-log concept in legacy application state

### Launch blockers
1. Most admin data still depends on the single `ApplicationState` JSON row.
2. Admin authorization is role-string based and not centralized around explicit permissions.
3. Plans, coupons, payments, settings, CMS content and audit logs lack relational tables.
4. Dashboard statistics are calculated by loading large collections into memory.
5. Member management, photo moderation and reporting APIs are not separated by responsibility.
6. No optimistic-concurrency or revision control exists for editable business content.
7. Secret payment/SMS/email credentials must never be returned to browsers.
8. Admin mutations need consistent validation, audit records and transaction boundaries.

## 4. Architecture

### Layers
- **UI:** `/app/admin/*`
- **API:** `/app/api/admin/*`
- **Authorization:** `lib/admin-auth.js`
- **Validation:** `lib/admin-validation.js`
- **Services:** `lib/admin-services/*`
- **Persistence:** Prisma relational models
- **Audit:** append-only `AdminAuditLog`

### API rule
Every write endpoint must perform, in order:
1. authenticate session;
2. require dual OTP for Super Admin operations;
3. check permission;
4. validate input;
5. execute a database transaction;
6. append audit record;
7. return a public-safe response.

## 5. Permission model

Launch roles:
- `super_admin`: all permissions and security settings
- `moderator`: members, photos, reports
- `finance_admin`: plans, coupons, payments, reports
- `content_admin`: homepage, legal and business content

Permission keys:
- `dashboard.read`
- `members.read`, `members.update_status`, `members.verify`
- `photos.moderate`
- `reports.read`, `reports.resolve`
- `plans.read`, `plans.write`
- `coupons.read`, `coupons.write`
- `payments.read`, `payments.review`
- `settings.read`, `settings.write`
- `content.read`, `content.write`
- `audit.read`
- `admins.manage`

The initial launch may map the existing `admin` role to all permissions while preserving the permission service so additional roles can be enabled later without rewriting endpoints.

## 6. Relational data model

### BusinessSetting
One row per setting key with typed JSON value, category, revision and timestamps. Secrets are stored separately and never returned by normal settings APIs.

### MembershipPlan
Name, slug, price, duration, active status, display order, badge, description and timestamps.

### PlanFeature
Plan ID, permission key, enabled flag and optional numeric limit.

### Coupon
Code, type, value, validity, global usage limit, per-user limit, active status.

### CouponPlan
Many-to-many link between coupons and plans.

### CouponRedemption
Coupon, user, transaction, discount amount and redemption time.

### PaymentTransaction
User, plan, gateway, order/payment IDs, amount, discount, status, verification metadata and timestamps.

### HomepageSection
Section key, content JSON, active status, display order, revision and timestamps.

### AdminAuditLog
Actor, action, entity type/id, safe metadata, IP, user agent and creation time. No password, OTP, token or full gateway secret may be logged.

### PhotoModerationEvent
Profile, photo identifier, moderator, action, reason and timestamp.

## 7. API map

### Dashboard
- `GET /api/admin/dashboard`
- Returns counts, revenue summaries, moderation queues and recent safe activities.

### Members
- `GET /api/admin/members`
- `GET /api/admin/members/:id`
- `PATCH /api/admin/members/:id/status`
- `POST /api/admin/members/:id/verification`

### Photos
- `GET /api/admin/photos?status=pending`
- `POST /api/admin/photos/:id/moderate`

### Settings
- `GET /api/admin/business-settings`
- `PATCH /api/admin/business-settings`
- `GET/PATCH /api/admin/security-settings` (Super Admin only)

### Plans and coupons
- CRUD `/api/admin/plans`
- CRUD `/api/admin/coupons`

### Payments
- `GET /api/admin/payments`
- `GET /api/admin/payments/:id`
- `POST /api/admin/payments/:id/manual-review`

### Content
- CRUD `/api/admin/content-sections`

### Reports and audit
- `GET /api/admin/reports/*`
- `GET /api/admin/audit-logs`

## 8. UI information architecture

- `/admin` — dashboard
- `/admin/members`
- `/admin/moderation/photos`
- `/admin/moderation/reports`
- `/admin/membership/plans`
- `/admin/membership/coupons`
- `/admin/payments`
- `/admin/content/homepage`
- `/admin/settings/business`
- `/admin/settings/communications`
- `/admin/settings/security`
- `/admin/reports`
- `/admin/audit-logs`

The sidebar must show only sections the current administrator is allowed to access.

## 9. Validation and safety rules

- Prices stored in paise as integers; never floating-point currency.
- Coupon percentage range: 1–100.
- Coupon validity end must be after start.
- Plan deletion blocked when referenced by active subscriptions or payments; deactivate instead.
- Member suspension requires a reason.
- Rejection and request-information actions require a reason.
- Business-email fields validated server-side.
- Uploaded images validated by MIME type, file size and dimensions.
- Sensitive settings are write-only or masked.
- All list endpoints paginated with maximum page size.
- Exports require explicit permission and are audited.

## 10. Dashboard metrics for launch

- Total, active, suspended and premium members
- Registrations today and last 30 days
- Pending profile/photo/report queues
- Successful, pending and failed payments
- Revenue today and this month
- Plan sales breakdown
- Recent audited actions

No metric may require loading all rows into Node.js memory; use database aggregates.

## 11. Service health

Launch health indicators are limited to checks the app can verify safely:
- database query
- configured mail provider presence
- configured SMS provider presence
- configured payment gateway presence
- latest successful backup timestamp
- storage configuration

SSL, DNS and external uptime monitoring remain deployment checks rather than fabricated application checks.

## 12. Migration and rollout

1. Add relational models without switching runtime.
2. Migrate legacy settings, plans, coupons, transactions, content and audit entries.
3. Verify counts and sampled values.
4. Enable relational reads per module behind environment flags.
5. Enable dual-write temporarily where rollback risk is high.
6. Cut over writes.
7. Remove legacy admin dependencies only after beta verification.

Rollback flags:
- `ADMIN_STORAGE_MODE=legacy|relational`
- module-specific flags may be used during staged rollout.

## 13. Testing gates

- Admin access denied to members and unauthenticated users
- Dual OTP enforced for security settings
- Every mutation creates one audit log
- Secrets are never returned by APIs
- Pagination and filters return stable results
- Plan/coupon validation and currency arithmetic verified
- Payment activation requires verified gateway signature
- Member and photo moderation updates public visibility correctly
- Concurrent content edits produce a conflict instead of silent overwrite
- Mobile and desktop admin layouts tested
- Production build and Prisma migration pass

## 14. Implementation sequence

### A. Admin relational foundation
Schema, permission service, audit service, migration and verification scripts.

### B. Admin Core
Dashboard, members, profile/photo moderation, business settings.

### C. Revenue controls
Plans, features, coupons, payment list and review.

### D. Content and reports
Homepage CMS, legal content, exports and analytics.

### E. Production verification
Build, migration rehearsal, backup/restore, security review and beta acceptance.

## 15. Definition of done

Admin Console 2.0 is launch-ready only when the owner can perform all routine launch operations from the UI, every privileged change is authorized and audited, no business value is hardcoded, secrets remain server-only, and the complete production build plus database migration has passed.
