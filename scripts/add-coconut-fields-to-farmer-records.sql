-- Add missing coconut-specific fields to existing farmer_records table
-- This will NOT delete or modify existing data, only add new columns

-- Add coconut plantation specific fields to farmer_records table
ALTER TABLE farmer_records 
ADD COLUMN IF NOT EXISTS date_of_plantation DATE,
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS total_area_hectares NUMERIC,
ADD COLUMN IF NOT EXISTS area_under_coconut_hectares NUMERIC,
ADD COLUMN IF NOT EXISTS seedlings_planted INT,
ADD COLUMN IF NOT EXISTS seedlings_survived INT,
ADD COLUMN IF NOT EXISTS block_tehsil_mandal TEXT,
ADD COLUMN IF NOT EXISTS active_status TEXT,
ADD COLUMN IF NOT EXISTS spacing TEXT,
ADD COLUMN IF NOT EXISTS number_of_plots INT,
ADD COLUMN IF NOT EXISTS land_ownership TEXT,
ADD COLUMN IF NOT EXISTS land_use_before_plantation TEXT,
ADD COLUMN IF NOT EXISTS type_of_variety TEXT,
ADD COLUMN IF NOT EXISTS plantation_model TEXT,
ADD COLUMN IF NOT EXISTS source_of_nursery TEXT,
ADD COLUMN IF NOT EXISTS size_of_pit TEXT,
ADD COLUMN IF NOT EXISTS mode_of_irrigation TEXT,
ADD COLUMN IF NOT EXISTS kharif_crop TEXT,
ADD COLUMN IF NOT EXISTS kharif_crop_duration_days INT,
ADD COLUMN IF NOT EXISTS rabi_crop TEXT,
ADD COLUMN IF NOT EXISTS rabi_crop_duration_days INT,
ADD COLUMN IF NOT EXISTS nitrogen_qty_kg NUMERIC,
ADD COLUMN IF NOT EXISTS phosphorous_qty_kg NUMERIC,
ADD COLUMN IF NOT EXISTS potassium_qty_kg NUMERIC,
ADD COLUMN IF NOT EXISTS organic_qty_kg NUMERIC,
ADD COLUMN IF NOT EXISTS other_qty_kg NUMERIC,
ADD COLUMN IF NOT EXISTS cost_of_seedlings NUMERIC,
ADD COLUMN IF NOT EXISTS fencing_propping_shading NUMERIC,
ADD COLUMN IF NOT EXISTS land_preparation NUMERIC,
ADD COLUMN IF NOT EXISTS manure_expenses NUMERIC,
ADD COLUMN IF NOT EXISTS irrigation_expenses NUMERIC,
ADD COLUMN IF NOT EXISTS weed_management NUMERIC,
ADD COLUMN IF NOT EXISTS plant_protection NUMERIC,
ADD COLUMN IF NOT EXISTS agriculture_implements NUMERIC,
ADD COLUMN IF NOT EXISTS manpower_expenses NUMERIC,
ADD COLUMN IF NOT EXISTS annual_fertilizers NUMERIC,
ADD COLUMN IF NOT EXISTS annual_irrigations NUMERIC,
ADD COLUMN IF NOT EXISTS annual_manpower NUMERIC;

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'farmer_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;
