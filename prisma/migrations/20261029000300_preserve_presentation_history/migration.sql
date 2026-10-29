CREATE OR REPLACE FUNCTION conex_preserve_project_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id OR NEW.revision_number <> OLD.revision_number THEN
    RAISE EXCEPTION 'A revision cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  IF OLD.review_status IN ('APPROVED', 'REVOKED') OR OLD.published_at IS NOT NULL THEN
    IF ROW(NEW.title, NEW.summary, NEW.sector, NEW.stage, NEW.market, NEW.impact, NEW.team, NEW.risks,
           NEW.support_needs, NEW.private_pitch_storage_key, NEW.pitch_original_filename,
           NEW.pitch_size_bytes, NEW.pitch_checksum, NEW.submitted_at, NEW.pitch_url, NEW.social_links, NEW.custom_links, NEW.branding_image_id, NEW.presented_at)
       IS DISTINCT FROM
       ROW(OLD.title, OLD.summary, OLD.sector, OLD.stage, OLD.market, OLD.impact, OLD.team, OLD.risks,
           OLD.support_needs, OLD.private_pitch_storage_key, OLD.pitch_original_filename,
           OLD.pitch_size_bytes, OLD.pitch_checksum, OLD.submitted_at, OLD.pitch_url, OLD.social_links, OLD.custom_links, OLD.branding_image_id, OLD.presented_at) THEN
      RAISE EXCEPTION 'Approved project content requires a new revision' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
