-- Backfill existing nullable trusted flags before enforcing the model default.
UPDATE users
SET is_trusted = false
WHERE is_trusted IS NULL;

ALTER TABLE users
    ALTER COLUMN is_trusted SET DEFAULT false;

ALTER TABLE users
    ALTER COLUMN is_trusted SET NOT NULL;
