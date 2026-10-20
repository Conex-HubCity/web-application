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
