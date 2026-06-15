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
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "company_bucket_public_read" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_authenticated_insert" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_authenticated_update" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_authenticated_delete" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_owner_insert" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_owner_update" ON storage.objects;
        DROP POLICY IF EXISTS "company_bucket_owner_delete" ON storage.objects;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        CREATE POLICY "company_bucket_public_read"
            ON storage.objects
            FOR SELECT
            USING (bucket_id = 'company');

        CREATE POLICY "company_bucket_owner_insert"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'company'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        CREATE POLICY "company_bucket_owner_update"
            ON storage.objects
            FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'company'
                AND (storage.foldername(name))[1] = auth.uid()::text
            )
            WITH CHECK (
                bucket_id = 'company'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        CREATE POLICY "company_bucket_owner_delete"
            ON storage.objects
            FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'company'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;
