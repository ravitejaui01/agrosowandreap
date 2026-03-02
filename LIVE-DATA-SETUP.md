# Live Data Setup Guide

## 🚀 For Existing Live Data

Since you already have live data, follow these steps to add the missing coconut fields to your existing `farmer_records` table.

### Step 1: Add Missing Columns to farmer_records Table

**Go to your Supabase Dashboard:**
1. Navigate to **SQL Editor**
2. Copy and execute this SQL script:

```sql
-- This script safely adds missing coconut fields to your existing farmer_records table
-- It will NOT delete or modify any existing data

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
```

### Step 2: Verify Table Structure

After running the SQL, check that the columns were added:

```sql
-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'farmer_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Step 3: Check Your Data

Your existing farmer records will now have the new columns (they will be NULL initially). The application should now be able to display:

- ✅ **Date of Plantation** (if populated)
- ✅ **Agent Name** (if populated)  
- ✅ **Submitted status**
- ✅ **All existing farmer data** (unchanged)

### Step 4: Optional - Populate Sample Data

If you want to test with some sample data for the new fields:

```sql
-- Update a few existing records with sample coconut data (optional)
UPDATE farmer_records 
SET 
  date_of_plantation = '2024-01-15',
  agent_name = 'Agent Smith',
  total_area_hectares = 2.5,
  area_under_coconut_hectares = 1.8,
  seedlings_planted = 120,
  seedlings_survived = 115,
  block_tehsil_mandal = 'Sample Block'
WHERE id = 'your-existing-record-id'
LIMIT 5;
```

## ✅ What This Accomplishes

1. **Preserves all existing data** - No data is lost or modified
2. **Adds missing coconut fields** - Farmer Records can now display coconut-specific data
3. **Fixes the field mismatch** - Both tables now have matching coconut fields
4. **Enables proper display** - Date of Plantation, Agent, etc. will show in the UI

## 🚀 Start Application

After running the SQL:

```bash
cd Agroforestry
npm run dev
```

Your Farmer Records page should now work correctly with your existing live data!
