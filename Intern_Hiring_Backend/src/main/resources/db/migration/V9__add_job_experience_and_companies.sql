ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS experience VARCHAR(255);

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    recruiter_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    recruiter_application_id BIGINT REFERENCES recruiter_applications(id) ON DELETE SET NULL,
    logo_url TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    company_full_name VARCHAR(255) NOT NULL,
    company_display_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(64) NOT NULL UNIQUE,
    billing_address TEXT NOT NULL,
    company_size VARCHAR(255) NOT NULL,
    company_phone VARCHAR(64) NOT NULL,
    company_website TEXT,
    company_intro TEXT,
    addresses TEXT NOT NULL,
    gallery_urls TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_recruiter_id ON companies(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_companies_tax_code ON companies(tax_code);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'company',
            'company',
            true,
            10485760,
            ARRAY['image/png', 'image/jpeg', 'image/jpg']
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        EXECUTE 'CREATE POLICY "company_bucket_public_read" ON storage.objects FOR SELECT USING (bucket_id = ''company'')';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        EXECUTE 'CREATE POLICY "company_bucket_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''company'')';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        EXECUTE 'CREATE POLICY "company_bucket_authenticated_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''company'') WITH CHECK (bucket_id = ''company'')';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        EXECUTE 'CREATE POLICY "company_bucket_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''company'')';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
