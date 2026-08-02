ALTER TABLE `users`
  ADD COLUMN `mobileVerificationStatus` VARCHAR(24) NOT NULL DEFAULT 'pending',
  ADD COLUMN `mobileVerificationMethod` VARCHAR(24) NULL,
  ADD COLUMN `mobileVerifiedBy` VARCHAR(64) NULL,
  ADD COLUMN `mobileVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `approvalStatus` VARCHAR(24) NOT NULL DEFAULT 'pending',
  ADD COLUMN `approvedBy` VARCHAR(64) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `approvalReason` TEXT NULL;

UPDATE `users`
SET `mobileVerificationStatus` = CASE WHEN `mobileVerified` = 1 THEN 'verified' ELSE 'pending' END,
    `mobileVerificationMethod` = CASE WHEN `mobileVerified` = 1 THEN 'legacy' ELSE NULL END,
    `approvalStatus` = CASE WHEN `verified` = 1 THEN 'approved' ELSE 'pending' END,
    `approvedAt` = CASE WHEN `verified` = 1 THEN `updatedAt` ELSE NULL END;

CREATE INDEX `users_approvalStatus_mobileVerificationStatus_idx`
ON `users`(`approvalStatus`, `mobileVerificationStatus`);

CREATE TABLE `admin_member_notes` (
  `id` VARCHAR(64) NOT NULL,
  `memberId` VARCHAR(64) NOT NULL,
  `authorId` VARCHAR(64) NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `admin_member_notes_memberId_createdAt_idx` (`memberId`, `createdAt`),
  INDEX `admin_member_notes_authorId_createdAt_idx` (`authorId`, `createdAt`),
  CONSTRAINT `admin_member_notes_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admin_member_notes_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
