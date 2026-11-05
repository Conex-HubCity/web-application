-- Existing age declarations are not privacy acknowledgements. Leave new fields null for existing accounts.
ALTER TABLE "users"
  ADD COLUMN "privacy_acknowledged_at" TIMESTAMPTZ(3),
  ADD COLUMN "privacy_policy_version" VARCHAR(100);
