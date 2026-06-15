DO $$
DECLARE
    constraint_record record;
BEGIN
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = current_schema()
          AND rel.relname = 'jobs'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;

    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;

    UPDATE jobs SET hidden = false WHERE hidden IS NULL;

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

    ALTER TABLE jobs ALTER COLUMN hidden SET DEFAULT false;
    ALTER TABLE jobs ALTER COLUMN hidden SET NOT NULL;

    ALTER TABLE jobs
        ADD CONSTRAINT jobs_status_check
        CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED'));
END $$;
