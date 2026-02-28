-- Add farmer_code to coconut_submissions for lookup by validator (Supabase may use farmer_code as id)
-- Safe when table does not exist yet (schema may run after migrations in some setups).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coconut_submissions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coconut_submissions' AND column_name = 'farmer_code'
  ) THEN
    ALTER TABLE coconut_submissions ADD COLUMN farmer_code TEXT;
    CREATE INDEX IF NOT EXISTS idx_coconut_submissions_farmer_code ON coconut_submissions (farmer_code);
    UPDATE coconut_submissions SET farmer_code = id WHERE farmer_code IS NULL;
  END IF;
END $$;
