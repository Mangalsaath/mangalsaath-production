-- Add birth details to matrimonial member profiles.
ALTER TABLE `member_profiles`
  ADD COLUMN `placeOfBirth` VARCHAR(180) NULL AFTER `dateOfBirth`,
  ADD COLUMN `timeOfBirth` VARCHAR(5) NULL AFTER `placeOfBirth`;
