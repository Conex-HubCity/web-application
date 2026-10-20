-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FOUNDER', 'MENTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MentorVisibility" AS ENUM ('PRIVATE', 'PLATFORM');

-- CreateEnum
CREATE TYPE "MentorDocumentType" AS ENUM ('CV', 'CERTIFICATE', 'DEGREE', 'WORK_REFERENCE', 'OTHER_EVIDENCE');

-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ProjectReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ValidationOutcome" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MentorshipRequestStatus" AS ENUM ('PENDING_REVIEW', 'REJECTED', 'INVITED', 'INTRO_SCHEDULED', 'AWAITING_CONSENT', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('MONTHLY_REPORT', 'MEETING');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(32),
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_verified_at" TIMESTAMPTZ(3),
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "user_id" UUID NOT NULL,
    "professional_title" VARCHAR(200),
    "biography" TEXT,
    "country_code" CHAR(2),
    "city" VARCHAR(150),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_country_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "motivations" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(3),
    "visibility_preference" "MentorVisibility" NOT NULL DEFAULT 'PRIVATE',
    "visibility_requested_at" TIMESTAMPTZ(3),
    "charter_accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "founder_profiles" (
    "user_id" UUID NOT NULL,
    "biography" TEXT,
    "country_code" CHAR(2),
    "city" VARCHAR(150),
    "sector" VARCHAR(150),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "adult_confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "founder_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mentor_documents" (
    "id" UUID NOT NULL,
    "mentor_user_id" UUID NOT NULL,
    "document_type" "MentorDocumentType" NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "private_storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "review_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "supersedes_document_id" UUID,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ(3),

    CONSTRAINT "mentor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_evidences" (
    "id" UUID NOT NULL,
    "founder_user_id" UUID NOT NULL,
    "private_storage_key" TEXT NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "certificate_reference" VARCHAR(200),
    "holder_name" VARCHAR(200) NOT NULL,
    "issued_at" DATE,
    "cohort" VARCHAR(150),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ(3),

    CONSTRAINT "certification_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "founder_user_id" UUID NOT NULL,
    "current_revision_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_revisions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT,
    "sector" VARCHAR(150),
    "stage" VARCHAR(100),
    "market" TEXT,
    "impact" TEXT,
    "team" TEXT,
    "risks" TEXT,
    "support_needs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "review_status" "ProjectReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "private_pitch_storage_key" TEXT,
    "pitch_original_filename" VARCHAR(255),
    "pitch_size_bytes" BIGINT,
    "pitch_checksum" CHAR(64),
    "pitch_scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "mentor_user_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_decisions" (
    "id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "certification_evidence_id" UUID,
    "mentor_user_id" UUID,
    "mentor_document_id" UUID,
    "project_revision_id" UUID,
    "outcome" "ValidationOutcome" NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_validation_documents" (
    "decision_id" UUID NOT NULL,
    "mentor_document_id" UUID NOT NULL,
    "mentor_user_id" UUID NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_validation_documents_pkey" PRIMARY KEY ("decision_id","mentor_document_id")
);

-- CreateTable
CREATE TABLE "mentorship_requests" (
    "id" UUID NOT NULL,
    "mentor_user_id" UUID NOT NULL,
    "project_revision_id" UUID NOT NULL,
    "status" "MentorshipRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "message" TEXT,
    "reviewed_by_user_id" UUID,
    "review_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "intro_meeting_at" TIMESTAMPTZ(3),
    "intro_meeting_held_at" TIMESTAMPTZ(3),
    "mentor_consented_at" TIMESTAMPTZ(3),
    "founder_consented_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentorship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorships" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "activated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "closure_reason" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "goals" TEXT,
    "progress" TEXT,
    "blockers" TEXT,
    "next_actions" TEXT,
    "report_period" DATE,
    "occurred_at" TIMESTAMPTZ(3),
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_reason" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_account_status_created_at_idx" ON "users"("account_status", "created_at");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE INDEX "mentor_profiles_verification_status_submitted_at_idx" ON "mentor_profiles"("verification_status", "submitted_at");

-- CreateIndex
CREATE INDEX "mentor_profiles_visibility_preference_verification_status_idx" ON "mentor_profiles"("visibility_preference", "verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_documents_private_storage_key_key" ON "mentor_documents"("private_storage_key");

-- CreateIndex
CREATE INDEX "mentor_documents_mentor_user_id_review_status_idx" ON "mentor_documents"("mentor_user_id", "review_status");

-- CreateIndex
CREATE INDEX "mentor_documents_mentor_user_id_supersedes_document_id_idx" ON "mentor_documents"("mentor_user_id", "supersedes_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_documents_mentor_user_id_id_key" ON "mentor_documents"("mentor_user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "certification_evidences_private_storage_key_key" ON "certification_evidences"("private_storage_key");

-- CreateIndex
CREATE INDEX "certification_evidences_founder_user_id_verification_status_idx" ON "certification_evidences"("founder_user_id", "verification_status");

-- CreateIndex
CREATE INDEX "certification_evidences_verification_status_submitted_at_idx" ON "certification_evidences"("verification_status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_founder_user_id_key" ON "projects"("founder_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_current_revision_id_key" ON "projects"("current_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_current_revision_id_key" ON "projects"("id", "current_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_revisions_private_pitch_storage_key_key" ON "project_revisions"("private_pitch_storage_key");

-- CreateIndex
CREATE INDEX "project_revisions_review_status_published_at_idx" ON "project_revisions"("review_status", "published_at");

-- CreateIndex
CREATE INDEX "project_revisions_sector_stage_idx" ON "project_revisions"("sector", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "project_revisions_project_id_revision_number_key" ON "project_revisions"("project_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "project_revisions_project_id_id_key" ON "project_revisions"("project_id", "id");

-- CreateIndex
CREATE INDEX "memberships_mentor_user_id_status_ends_at_idx" ON "memberships"("mentor_user_id", "status", "ends_at");

-- CreateIndex
CREATE INDEX "validation_decisions_reviewer_user_id_decided_at_idx" ON "validation_decisions"("reviewer_user_id", "decided_at");

-- CreateIndex
CREATE INDEX "validation_decisions_certification_evidence_id_decided_at_idx" ON "validation_decisions"("certification_evidence_id", "decided_at");

-- CreateIndex
CREATE INDEX "validation_decisions_mentor_user_id_decided_at_idx" ON "validation_decisions"("mentor_user_id", "decided_at");

-- CreateIndex
CREATE INDEX "validation_decisions_mentor_document_id_decided_at_idx" ON "validation_decisions"("mentor_document_id", "decided_at");

-- CreateIndex
CREATE INDEX "validation_decisions_project_revision_id_decided_at_idx" ON "validation_decisions"("project_revision_id", "decided_at");

-- CreateIndex
CREATE UNIQUE INDEX "validation_decisions_mentor_user_id_id_key" ON "validation_decisions"("mentor_user_id", "id");

-- CreateIndex
CREATE INDEX "mentor_validation_documents_mentor_user_id_decision_id_idx" ON "mentor_validation_documents"("mentor_user_id", "decision_id");

-- CreateIndex
CREATE INDEX "mentor_validation_documents_mentor_user_id_mentor_document__idx" ON "mentor_validation_documents"("mentor_user_id", "mentor_document_id");

-- CreateIndex
CREATE INDEX "mentorship_requests_mentor_user_id_status_idx" ON "mentorship_requests"("mentor_user_id", "status");

-- CreateIndex
CREATE INDEX "mentorship_requests_project_revision_id_status_idx" ON "mentorship_requests"("project_revision_id", "status");

-- CreateIndex
CREATE INDEX "mentorship_requests_reviewed_by_user_id_idx" ON "mentorship_requests"("reviewed_by_user_id");

-- CreateIndex
CREATE INDEX "mentorship_requests_status_created_at_idx" ON "mentorship_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "mentorships_request_id_key" ON "mentorships"("request_id");

-- CreateIndex
CREATE INDEX "mentorships_status_activated_at_idx" ON "mentorships"("status", "activated_at");

-- CreateIndex
CREATE INDEX "follow_ups_mentorship_id_status_occurred_at_idx" ON "follow_ups"("mentorship_id", "status", "occurred_at");

-- CreateIndex
CREATE INDEX "follow_ups_author_user_id_idx" ON "follow_ups"("author_user_id");

-- CreateIndex
CREATE INDEX "follow_ups_reviewed_by_user_id_idx" ON "follow_ups"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "founder_profiles" ADD CONSTRAINT "founder_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_documents" ADD CONSTRAINT "mentor_documents_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_documents" ADD CONSTRAINT "mentor_documents_mentor_user_id_supersedes_document_id_fkey" FOREIGN KEY ("mentor_user_id", "supersedes_document_id") REFERENCES "mentor_documents"("mentor_user_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certification_evidences" ADD CONSTRAINT "certification_evidences_founder_user_id_fkey" FOREIGN KEY ("founder_user_id") REFERENCES "founder_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_founder_user_id_fkey" FOREIGN KEY ("founder_user_id") REFERENCES "founder_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_current_revision_id_fkey" FOREIGN KEY ("id", "current_revision_id") REFERENCES "project_revisions"("project_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_revisions" ADD CONSTRAINT "project_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_decisions" ADD CONSTRAINT "validation_decisions_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_decisions" ADD CONSTRAINT "validation_decisions_certification_evidence_id_fkey" FOREIGN KEY ("certification_evidence_id") REFERENCES "certification_evidences"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_decisions" ADD CONSTRAINT "validation_decisions_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_decisions" ADD CONSTRAINT "validation_decisions_mentor_document_id_fkey" FOREIGN KEY ("mentor_document_id") REFERENCES "mentor_documents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_decisions" ADD CONSTRAINT "validation_decisions_project_revision_id_fkey" FOREIGN KEY ("project_revision_id") REFERENCES "project_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_validation_documents" ADD CONSTRAINT "mentor_validation_documents_mentor_user_id_decision_id_fkey" FOREIGN KEY ("mentor_user_id", "decision_id") REFERENCES "validation_decisions"("mentor_user_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_validation_documents" ADD CONSTRAINT "mentor_validation_documents_mentor_user_id_mentor_document_fkey" FOREIGN KEY ("mentor_user_id", "mentor_document_id") REFERENCES "mentor_documents"("mentor_user_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "mentor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_project_revision_id_fkey" FOREIGN KEY ("project_revision_id") REFERENCES "project_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mentorship_requests"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Constraints and audit protections not represented by Prisma's data model.
-- Included in the initial migration; do not execute separately after deployment.
ALTER TABLE users ADD CONSTRAINT users_contact_required CHECK (
  (email IS NOT NULL AND btrim(email) <> '') OR
  (phone IS NOT NULL AND btrim(phone) <> '')
);
ALTER TABLE users ADD CONSTRAINT users_email_normalized CHECK (
  email IS NULL OR (email = lower(btrim(email)) AND email <> '')
);
ALTER TABLE users ADD CONSTRAINT users_phone_not_blank CHECK (
  phone IS NULL OR (phone = btrim(phone) AND phone <> '')
);
ALTER TABLE users ADD CONSTRAINT users_identity_not_blank CHECK (
  btrim(first_name) <> '' AND btrim(password_hash) <> ''
);

ALTER TABLE validation_decisions ADD CONSTRAINT validation_one_target CHECK (
  num_nonnulls(certification_evidence_id, mentor_user_id, mentor_document_id, project_revision_id) = 1
);
ALTER TABLE validation_decisions ADD CONSTRAINT validation_reason_required CHECK (
  outcome = 'APPROVED' OR (reason IS NOT NULL AND btrim(reason) <> '')
);

ALTER TABLE mentor_documents ADD CONSTRAINT mentor_document_file_valid CHECK (
  size_bytes > 0 AND checksum ~ '^[0-9a-f]{64}$' AND
  btrim(private_storage_key) <> '' AND btrim(original_filename) <> '' AND btrim(mime_type) <> ''
);
ALTER TABLE mentor_documents ADD CONSTRAINT mentor_document_no_self_replacement CHECK (
  supersedes_document_id IS NULL OR supersedes_document_id <> id
);
ALTER TABLE mentor_documents ADD CONSTRAINT mentor_document_approved_clean CHECK (
  review_status <> 'APPROVED' OR (scan_status = 'CLEAN' AND withdrawn_at IS NULL)
);
ALTER TABLE mentor_documents ADD CONSTRAINT mentor_document_withdrawal_date CHECK (
  withdrawn_at IS NULL OR withdrawn_at >= uploaded_at
);

ALTER TABLE certification_evidences ADD CONSTRAINT certification_file_valid CHECK (
  size_bytes > 0 AND checksum ~ '^[0-9a-f]{64}$' AND
  btrim(private_storage_key) <> '' AND btrim(original_filename) <> '' AND
  btrim(mime_type) <> '' AND btrim(holder_name) <> ''
);
ALTER TABLE certification_evidences ADD CONSTRAINT certification_approved_clean CHECK (
  verification_status <> 'APPROVED' OR (scan_status = 'CLEAN' AND withdrawn_at IS NULL)
);

ALTER TABLE project_revisions ADD CONSTRAINT project_revision_number_positive CHECK (revision_number > 0);
ALTER TABLE project_revisions ADD CONSTRAINT project_revision_title_required CHECK (btrim(title) <> '');
ALTER TABLE project_revisions ADD CONSTRAINT project_pitch_metadata_complete CHECK (
  num_nonnulls(private_pitch_storage_key, pitch_original_filename, pitch_size_bytes, pitch_checksum) = 0
  OR (
    num_nonnulls(private_pitch_storage_key, pitch_original_filename, pitch_size_bytes, pitch_checksum) = 4
    AND btrim(private_pitch_storage_key) <> '' AND btrim(pitch_original_filename) <> ''
    AND pitch_size_bytes > 0 AND pitch_checksum ~ '^[0-9a-f]{64}$'
  )
);
ALTER TABLE project_revisions ADD CONSTRAINT project_submission_requires_pitch CHECK (
  review_status = 'DRAFT' OR (
    submitted_at IS NOT NULL AND private_pitch_storage_key IS NOT NULL AND pitch_scan_status = 'CLEAN'
  )
);
ALTER TABLE project_revisions ADD CONSTRAINT project_publication_valid CHECK (
  published_at IS NULL OR (
    review_status IN ('APPROVED', 'REVOKED') AND submitted_at IS NOT NULL
    AND private_pitch_storage_key IS NOT NULL AND pitch_scan_status = 'CLEAN'
    AND published_at >= submitted_at
  )
);
ALTER TABLE project_revisions ADD CONSTRAINT project_archive_date_valid CHECK (
  archived_at IS NULL OR archived_at >= created_at
);

ALTER TABLE memberships ADD CONSTRAINT membership_period_valid CHECK (
  (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
  AND (status <> 'ACTIVE' OR (starts_at IS NOT NULL AND ends_at IS NOT NULL))
);
ALTER TABLE mentorship_requests ADD CONSTRAINT request_review_complete CHECK (
  num_nonnulls(reviewed_by_user_id, reviewed_at) IN (0, 2)
);
ALTER TABLE mentorship_requests ADD CONSTRAINT request_acceptance_complete CHECK (
  status <> 'ACCEPTED' OR (
    reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL
    AND intro_meeting_held_at IS NOT NULL
    AND mentor_consented_at IS NOT NULL AND founder_consented_at IS NOT NULL
    AND mentor_consented_at >= intro_meeting_held_at
    AND founder_consented_at >= intro_meeting_held_at
  )
);
ALTER TABLE mentorships ADD CONSTRAINT mentorship_closure_valid CHECK (
  (status IN ('ACTIVE', 'PAUSED') AND ended_at IS NULL)
  OR (status IN ('COMPLETED', 'TERMINATED') AND ended_at IS NOT NULL
      AND ended_at >= activated_at AND closure_reason IS NOT NULL AND btrim(closure_reason) <> '')
);
ALTER TABLE follow_ups ADD CONSTRAINT follow_up_approval_complete CHECK (
  status <> 'APPROVED' OR (
    occurred_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL
    AND reviewed_at >= occurred_at
  )
);
ALTER TABLE follow_ups ADD CONSTRAINT follow_up_monthly_period CHECK (
  type <> 'MONTHLY_REPORT' OR status = 'DRAFT' OR (
    report_period IS NOT NULL AND extract(day FROM report_period) = 1
  )
);
ALTER TABLE follow_ups ADD CONSTRAINT follow_up_content_required CHECK (
  status = 'DRAFT' OR (summary IS NOT NULL AND btrim(summary) <> '')
);

CREATE FUNCTION conex_preserve_audit_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER validation_decisions_immutable BEFORE UPDATE OR DELETE ON validation_decisions
FOR EACH ROW EXECUTE FUNCTION conex_preserve_audit_record();
CREATE TRIGGER mentor_validation_documents_immutable BEFORE UPDATE OR DELETE ON mentor_validation_documents
FOR EACH ROW EXECUTE FUNCTION conex_preserve_audit_record();

CREATE FUNCTION conex_preserve_document_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.mentor_user_id, NEW.document_type, NEW.private_storage_key, NEW.original_filename,
         NEW.mime_type, NEW.size_bytes, NEW.checksum, NEW.supersedes_document_id, NEW.uploaded_at)
     IS DISTINCT FROM
     ROW(OLD.mentor_user_id, OLD.document_type, OLD.private_storage_key, OLD.original_filename,
         OLD.mime_type, OLD.size_bytes, OLD.checksum, OLD.supersedes_document_id, OLD.uploaded_at) THEN
    RAISE EXCEPTION 'Upload a new document instead of rewriting its evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mentor_document_content_immutable BEFORE UPDATE ON mentor_documents
FOR EACH ROW EXECUTE FUNCTION conex_preserve_document_content();

CREATE FUNCTION conex_preserve_project_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id OR NEW.revision_number <> OLD.revision_number THEN
    RAISE EXCEPTION 'A revision cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  IF OLD.review_status IN ('APPROVED', 'REVOKED') OR OLD.published_at IS NOT NULL THEN
    IF ROW(NEW.title, NEW.summary, NEW.sector, NEW.stage, NEW.market, NEW.impact, NEW.team, NEW.risks,
           NEW.support_needs, NEW.private_pitch_storage_key, NEW.pitch_original_filename,
           NEW.pitch_size_bytes, NEW.pitch_checksum, NEW.submitted_at)
       IS DISTINCT FROM
       ROW(OLD.title, OLD.summary, OLD.sector, OLD.stage, OLD.market, OLD.impact, OLD.team, OLD.risks,
           OLD.support_needs, OLD.private_pitch_storage_key, OLD.pitch_original_filename,
           OLD.pitch_size_bytes, OLD.pitch_checksum, OLD.submitted_at) THEN
      RAISE EXCEPTION 'Approved project content requires a new revision' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_revision_history_protected BEFORE UPDATE ON project_revisions
FOR EACH ROW EXECUTE FUNCTION conex_preserve_project_revision();

CREATE FUNCTION conex_reject_self_mentoring() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM project_revisions r JOIN projects p ON p.id = r.project_id
    WHERE r.id = NEW.project_revision_id AND p.founder_user_id = NEW.mentor_user_id
  ) THEN
    RAISE EXCEPTION 'A founder cannot mentor their own project' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND
     ROW(NEW.mentor_user_id, NEW.project_revision_id) IS DISTINCT FROM ROW(OLD.mentor_user_id, OLD.project_revision_id) THEN
    RAISE EXCEPTION 'A mentorship request cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mentorship_request_parties_fixed BEFORE INSERT OR UPDATE ON mentorship_requests
FOR EACH ROW EXECUTE FUNCTION conex_reject_self_mentoring();
