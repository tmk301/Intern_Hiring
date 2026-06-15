-- Drop ALL existing status check constraints first (V3/V4 may have been skipped by Flyway baseline)
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
END $$;

-- Add hidden column if missing
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;
UPDATE jobs SET hidden = false WHERE hidden IS NULL;

-- Convert legacy statuses
UPDATE jobs SET status = 'APPROVED', hidden = false WHERE status = 'ACTIVE';
UPDATE jobs SET status = 'APPROVED', hidden = true WHERE status = 'HIDDEN';
UPDATE jobs SET status = 'REJECTED', deleted_at = COALESCE(deleted_at, NOW()) WHERE status = 'TRASHED';

-- Re-add correct constraint
ALTER TABLE jobs ALTER COLUMN hidden SET NOT NULL;
ALTER TABLE jobs
    ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED'));
