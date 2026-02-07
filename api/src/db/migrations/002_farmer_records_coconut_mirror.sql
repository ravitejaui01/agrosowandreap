-- Add columns to farmer_records so Data Validator can show coconut-submission context
-- (block/tehsil, plantation date, seedlings count, agent name)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'block_tehsil_mandal') THEN
    ALTER TABLE farmer_records ADD COLUMN block_tehsil_mandal TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'date_of_plantation') THEN
    ALTER TABLE farmer_records ADD COLUMN date_of_plantation DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'seedlings_planted') THEN
    ALTER TABLE farmer_records ADD COLUMN seedlings_planted INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmer_records' AND column_name = 'agent_name') THEN
    ALTER TABLE farmer_records ADD COLUMN agent_name TEXT;
  END IF;
END $$;
