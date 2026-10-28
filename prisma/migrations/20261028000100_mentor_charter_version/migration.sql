-- Existing acceptances belong to the earlier summary; do not assign them a new version.
ALTER TABLE "mentor_profiles" ADD COLUMN "charter_version" VARCHAR(100);
