# Member Experience Test Checklist — v6.4.0

## Profile wizard

- [ ] Login as a normal member and open **Edit my profile**.
- [ ] Confirm four wizard steps appear.
- [ ] Confirm Previous and Next navigation works on desktop and mobile.
- [ ] Confirm Save profile is available only on step 4.
- [ ] Confirm existing member details remain populated.

## Validation

- [ ] About text shorter than 40 characters is rejected.
- [ ] A member below age 18 is rejected.
- [ ] Height below 100 cm or above 250 cm is rejected.
- [ ] Preferred minimum age above maximum age is rejected.
- [ ] A valid completed profile saves successfully.

## Photos

- [ ] Upload JPG, PNG, and WEBP images under 2 MB.
- [ ] Confirm no more than 10 photos can be retained.
- [ ] Select a primary photo.
- [ ] Remove the primary photo and confirm another photo becomes primary.
- [ ] Confirm changing photos sets moderation status to pending.

## Dashboard quality indicators

- [ ] Profile completion displays a percentage.
- [ ] Trust Score displays a value out of 100.
- [ ] Trust breakdown shows mobile, email, photo, and admin review indicators.
- [ ] Completion increases after missing profile fields are added.
- [ ] Trust Score increases after verification conditions are completed.

## Regression

- [ ] Registration and OTP still work.
- [ ] Member login and logout still work.
- [ ] Search profiles still loads.
- [ ] Interests and messages still work.
- [ ] Super Admin dual OTP still works.
