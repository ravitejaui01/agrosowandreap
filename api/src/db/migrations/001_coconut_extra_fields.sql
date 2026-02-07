-- Add new coconut submission columns for existing databases.
-- Run this if coconut_submissions was created before these fields were added.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'active_status') THEN
    ALTER TABLE coconut_submissions ADD COLUMN active_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'land_ownership') THEN
    ALTER TABLE coconut_submissions ADD COLUMN land_ownership TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'land_use_before_plantation') THEN
    ALTER TABLE coconut_submissions ADD COLUMN land_use_before_plantation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'tree_clearance_before_plantation') THEN
    ALTER TABLE coconut_submissions ADD COLUMN tree_clearance_before_plantation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'burning_trees_for_site_preparation') THEN
    ALTER TABLE coconut_submissions ADD COLUMN burning_trees_for_site_preparation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'age_of_sapling_months') THEN
    ALTER TABLE coconut_submissions ADD COLUMN age_of_sapling_months INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'land_patta_survey_number') THEN
    ALTER TABLE coconut_submissions ADD COLUMN land_patta_survey_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'plantation_model') THEN
    ALTER TABLE coconut_submissions ADD COLUMN plantation_model TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'source_of_nursery') THEN
    ALTER TABLE coconut_submissions ADD COLUMN source_of_nursery TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'type_of_variety') THEN
    ALTER TABLE coconut_submissions ADD COLUMN type_of_variety TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'size_of_pit') THEN
    ALTER TABLE coconut_submissions ADD COLUMN size_of_pit TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'mode_of_irrigation') THEN
    ALTER TABLE coconut_submissions ADD COLUMN mode_of_irrigation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'kharif_crop') THEN
    ALTER TABLE coconut_submissions ADD COLUMN kharif_crop TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'kharif_crop_duration_days') THEN
    ALTER TABLE coconut_submissions ADD COLUMN kharif_crop_duration_days INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'rabi_crop') THEN
    ALTER TABLE coconut_submissions ADD COLUMN rabi_crop TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'rabi_crop_duration_days') THEN
    ALTER TABLE coconut_submissions ADD COLUMN rabi_crop_duration_days INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'nitrogen_qty_kg') THEN
    ALTER TABLE coconut_submissions ADD COLUMN nitrogen_qty_kg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'phosphorous_qty_kg') THEN
    ALTER TABLE coconut_submissions ADD COLUMN phosphorous_qty_kg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'potassium_qty_kg') THEN
    ALTER TABLE coconut_submissions ADD COLUMN potassium_qty_kg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'organic_qty_kg') THEN
    ALTER TABLE coconut_submissions ADD COLUMN organic_qty_kg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'other_qty_kg') THEN
    ALTER TABLE coconut_submissions ADD COLUMN other_qty_kg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'cost_of_seedlings') THEN
    ALTER TABLE coconut_submissions ADD COLUMN cost_of_seedlings NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'fencing_propping_shading') THEN
    ALTER TABLE coconut_submissions ADD COLUMN fencing_propping_shading NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'land_preparation') THEN
    ALTER TABLE coconut_submissions ADD COLUMN land_preparation NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'manure_expenses') THEN
    ALTER TABLE coconut_submissions ADD COLUMN manure_expenses NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'irrigation_expenses') THEN
    ALTER TABLE coconut_submissions ADD COLUMN irrigation_expenses NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'weed_management') THEN
    ALTER TABLE coconut_submissions ADD COLUMN weed_management NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'plant_protection') THEN
    ALTER TABLE coconut_submissions ADD COLUMN plant_protection NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'agriculture_implements') THEN
    ALTER TABLE coconut_submissions ADD COLUMN agriculture_implements NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'manpower_expenses') THEN
    ALTER TABLE coconut_submissions ADD COLUMN manpower_expenses NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'annual_fertilizers') THEN
    ALTER TABLE coconut_submissions ADD COLUMN annual_fertilizers NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'annual_irrigations') THEN
    ALTER TABLE coconut_submissions ADD COLUMN annual_irrigations NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coconut_submissions' AND column_name = 'annual_manpower') THEN
    ALTER TABLE coconut_submissions ADD COLUMN annual_manpower NUMERIC;
  END IF;
END $$;
