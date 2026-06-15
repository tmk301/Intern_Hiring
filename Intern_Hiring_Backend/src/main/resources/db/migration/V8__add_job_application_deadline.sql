ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS application_deadline DATE;
