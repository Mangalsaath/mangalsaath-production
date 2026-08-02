ALTER TABLE `payment_transactions`
  ADD COLUMN `manualReference` VARCHAR(40) NULL,
  ADD COLUMN `proofMime` VARCHAR(40) NULL,
  ADD COLUMN `proofData` LONGTEXT NULL,
  ADD UNIQUE INDEX `payment_transactions_manualReference_key` (`manualReference`);
