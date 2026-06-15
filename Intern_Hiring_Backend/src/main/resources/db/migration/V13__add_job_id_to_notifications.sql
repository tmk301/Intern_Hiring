ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS job_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'notifications'
          AND a.attname = 'job_id'
          AND c.contype = 'f'
    ) THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notifications_job
            FOREIGN KEY (job_id) REFERENCES jobs (id);
    END IF;
END $$;
