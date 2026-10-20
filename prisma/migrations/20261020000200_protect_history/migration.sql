CREATE FUNCTION conex_preserve_certification_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.founder_user_id, NEW.private_storage_key, NEW.original_filename, NEW.mime_type,
         NEW.size_bytes, NEW.checksum, NEW.certificate_reference, NEW.holder_name,
         NEW.issued_at, NEW.cohort, NEW.submitted_at)
     IS DISTINCT FROM
     ROW(OLD.founder_user_id, OLD.private_storage_key, OLD.original_filename, OLD.mime_type,
         OLD.size_bytes, OLD.checksum, OLD.certificate_reference, OLD.holder_name,
         OLD.issued_at, OLD.cohort, OLD.submitted_at) THEN
    RAISE EXCEPTION 'Certification evidence cannot be rewritten' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER certification_content_immutable BEFORE UPDATE ON certification_evidences
FOR EACH ROW EXECUTE FUNCTION conex_preserve_certification_content();

CREATE FUNCTION conex_preserve_project_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.founder_user_id <> OLD.founder_user_id THEN
    RAISE EXCEPTION 'A project cannot be reassigned to another founder' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_owner_immutable BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION conex_preserve_project_owner();

CREATE FUNCTION conex_preserve_approved_follow_up() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    RAISE EXCEPTION 'Approved follow-ups are historical records' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.mentorship_id, NEW.author_user_id) IS DISTINCT FROM ROW(OLD.mentorship_id, OLD.author_user_id) THEN
    RAISE EXCEPTION 'A follow-up cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER approved_follow_up_immutable BEFORE UPDATE OR DELETE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION conex_preserve_approved_follow_up();

CREATE FUNCTION conex_preserve_mentorship_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.request_id <> OLD.request_id THEN
    RAISE EXCEPTION 'A mentorship cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mentorship_request_immutable BEFORE UPDATE ON mentorships
FOR EACH ROW EXECUTE FUNCTION conex_preserve_mentorship_request();
