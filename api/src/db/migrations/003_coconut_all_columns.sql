-- Ensure ALL coconut_submissions columns exist (for DBs created from older schemas).
-- Covers any columns not in 001 and edge cases. Idempotent.

DO $$
BEGIN
  -- Core columns that may be missing from very old schemas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'total_area_hectares') THEN
    ALTER TABLE coconut_submissions ADD COLUMN total_area_hectares NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'mapped_area_acres') THEN
    ALTER TABLE coconut_submissions ADD COLUMN mapped_area_acres NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'location') THEN
    ALTER TABLE coconut_submissions ADD COLUMN location JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'block_tehsil_mandal') THEN
    ALTER TABLE coconut_submissions ADD COLUMN block_tehsil_mandal TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'plots') THEN
    ALTER TABLE coconut_submissions ADD COLUMN plots JSONB DEFAULT '[]';
  END IF;
END $$;
