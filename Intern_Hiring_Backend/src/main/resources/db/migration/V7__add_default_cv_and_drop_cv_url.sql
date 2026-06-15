ALTER TABLE users DROP COLUMN IF EXISTS cv_url;

UPDATE users
SET cv_list = (
    SELECT jsonb_agg(
        CASE
            WHEN item.ordinality = 1 THEN item.value || '{"isDefault": true}'::jsonb
            ELSE item.value || '{"isDefault": false}'::jsonb
        END
        ORDER BY item.ordinality
    )
    FROM jsonb_array_elements(cv_list::jsonb) WITH ORDINALITY AS item(value, ordinality)
)
WHERE cv_list IS NOT NULL
  AND jsonb_typeof(cv_list::jsonb) = 'array'
  AND jsonb_array_length(cv_list::jsonb) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(cv_list::jsonb) AS item(value)
      WHERE item.value ? 'isDefault'
        AND (item.value ->> 'isDefault')::boolean = true
  );
