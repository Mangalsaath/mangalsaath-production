# MangalSaath v7.0 Launch Readiness Checklist

Status values: **PASS**, **BLOCKED**, **PENDING**.

## Core member journey

- Authentication and session security — PENDING local production build
- Mobile OTP registration — PENDING live provider test
- Email verification — BLOCKED until live provider/flow verification
- Profile wizard and editing — PENDING regression test
- Photo upload and moderation — PENDING storage replacement decision
- Search and explainable matching — IMPLEMENTED; PENDING local test
- Interests — PENDING relational cutover
- Messaging — PENDING relational cutover
- Block and report controls — IMPLEMENTED; PENDING local test
- Membership, coupon and payment confirmation — PENDING production payment review

## Administrator journey

- Super Admin password + mobile OTP + email OTP — IMPLEMENTED; PENDING live provider test
- Member and photo moderation — PENDING regression test
- Report resolution — IMPLEMENTED; PENDING regression test
- Plans, coupons, payment and business settings — PENDING regression test
- Homepage content configuration — PENDING regression test

## Production engineering

- Relational users/sessions — IMPLEMENTED; PENDING migration verification
- Relational profiles — IMPLEMENTED; PENDING migration verification
- Relational interests/messages — BLOCKED
- Relational blocks/reports — BLOCKED
- Object storage for profile/payment images — BLOCKED
- Shared/distributed rate limiting — BLOCKED
- Production build — BLOCKED until run successfully
- Database backup and restore drill — BLOCKED
- Error monitoring and alerting — BLOCKED
- Privacy, Terms, Refund and Contact content review — PENDING
- Domain, SSL, DNS, environment variables and deployment — PENDING

## Launch gate

Public beta must not start while any launch-critical item remains **BLOCKED**.
