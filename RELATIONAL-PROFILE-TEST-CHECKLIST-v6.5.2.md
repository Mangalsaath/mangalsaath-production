# Relational Profile Cutover Test Checklist

- [ ] Existing member can open their own profile.
- [ ] Existing member can edit and save all essential fields.
- [ ] User first name, last name, city and profession update with the profile.
- [ ] Under-18 date of birth is rejected.
- [ ] About section shorter than 40 characters is rejected.
- [ ] Maximum 10 valid images are retained.
- [ ] Changing photos resets moderation to pending.
- [ ] Public search excludes profiles below 80% completion.
- [ ] Public search excludes profiles without an approved primary photo.
- [ ] Blocked members do not see each other.
- [ ] Owner/admin receives private profile fields; public viewers do not.
- [ ] `npm run db:profiles:verify` reports `ready: true`.
- [ ] `npm run build` succeeds.
- [ ] Setting `PROFILE_STORAGE_MODE=legacy` restores the previous route behaviour.
