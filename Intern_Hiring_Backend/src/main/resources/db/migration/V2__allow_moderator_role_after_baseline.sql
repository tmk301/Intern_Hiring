DO $$
DECLARE
    role_type_name text;
    role_check_name text;
BEGIN
    SELECT format('%I.%I', n.nspname, t.typname)
    INTO role_type_name
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace cn ON cn.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE cn.nspname = current_schema()
      AND c.relname = 'users'
      AND a.attname = 'role'
      AND t.typtype = 'e'
      AND NOT a.attisdropped;

    IF role_type_name IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE format('%I.%I', n.nspname, t.typname) = role_type_name
              AND e.enumlabel = 'MODERATOR'
        ) THEN
            EXECUTE 'ALTER TYPE ' || role_type_name || ' ADD VALUE ''MODERATOR''';
        END IF;
        RETURN;
    END IF;

    SELECT con.conname
    INTO role_check_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = current_schema()
      AND rel.relname = 'users'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
    LIMIT 1;

    IF role_check_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', role_check_name);
    END IF;

    ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'CANDIDATE', 'RECRUITER', 'MODERATOR'));
END $$;
