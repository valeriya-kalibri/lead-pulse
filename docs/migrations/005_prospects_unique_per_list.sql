-- Ensure prospect URL uniqueness is scoped to the list, not the user.
-- This allows the same domain to be imported and re-scraped across different lists.
-- Safe to run even if the constraints don't exist.

DO $$
BEGIN
  -- Drop user-scoped unique constraint if it exists (blocks re-importing same domain in new lists)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prospects_user_id_website_url_key'
  ) THEN
    ALTER TABLE prospects DROP CONSTRAINT prospects_user_id_website_url_key;
  END IF;

  -- Add list-scoped unique constraint if it doesn't exist (prevents true dupes within one list)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prospects_list_id_website_url_key'
  ) THEN
    ALTER TABLE prospects ADD CONSTRAINT prospects_list_id_website_url_key UNIQUE (list_id, website_url);
  END IF;
END $$;
