-- Keep simulated local approvals distinguishable from reviewed evidence.
ALTER TABLE "certification_evidences" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;

CREATE FUNCTION conex_preserve_certification_origin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_test IS DISTINCT FROM OLD.is_test THEN
    RAISE EXCEPTION 'Certification origin cannot be rewritten' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER certification_origin_immutable BEFORE UPDATE ON certification_evidences
FOR EACH ROW EXECUTE FUNCTION conex_preserve_certification_origin();
