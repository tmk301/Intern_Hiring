DO $$
DECLARE
    status_check_name text;
BEGIN
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

    UPDATE jobs
    SET hidden = false,
        status = 'APPROVED'
    WHERE status = 'ACTIVE';

    UPDATE jobs
    SET hidden = true,
        status = 'APPROVED'
    WHERE status = 'HIDDEN';

    UPDATE jobs
    SET status = 'REJECTED',
        deleted_at = COALESCE(deleted_at, NOW())
    WHERE status = 'TRASHED';

    SELECT con.conname
    INTO status_check_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = current_schema()
      AND rel.relname = 'jobs'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LIMIT 1;

    IF status_check_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE jobs DROP CONSTRAINT %I', status_check_name);
    END IF;

    ALTER TABLE jobs
        ADD CONSTRAINT jobs_status_check
        CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED'));
END $$;
