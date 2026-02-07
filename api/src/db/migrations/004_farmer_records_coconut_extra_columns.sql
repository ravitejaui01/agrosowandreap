-- Add more coconut-submission columns to farmer_records so Data Validator sees full coconut context

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'total_area_hectares') THEN
    ALTER TABLE farmer_records ADD COLUMN total_area_hectares NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'area_under_coconut_hectares') THEN
    ALTER TABLE farmer_records ADD COLUMN area_under_coconut_hectares NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'seedlings_survived') THEN
    ALTER TABLE farmer_records ADD COLUMN seedlings_survived INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'land_ownership') THEN
    ALTER TABLE farmer_records ADD COLUMN land_ownership TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'land_use_before_plantation') THEN
    ALTER TABLE farmer_records ADD COLUMN land_use_before_plantation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'type_of_variety') THEN
    ALTER TABLE farmer_records ADD COLUMN type_of_variety TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'plantation_model') THEN
    ALTER TABLE farmer_records ADD COLUMN plantation_model TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'active_status') THEN
    ALTER TABLE farmer_records ADD COLUMN active_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'spacing') THEN
    ALTER TABLE farmer_records ADD COLUMN spacing TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'mode_of_irrigation') THEN
    ALTER TABLE farmer_records ADD COLUMN mode_of_irrigation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'number_of_plots') THEN
    ALTER TABLE farmer_records ADD COLUMN number_of_plots INT;
  END IF;
END $$;
