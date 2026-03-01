# Supabase Setup Guide

## 🚀 Quick Setup (Automatic)

### Step 1: Create Tables in Supabase

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Navigate to SQL Editor**: In the left sidebar, click "SQL Editor"
3. **Create Tables**: Copy and execute this SQL:

```sql
-- Create coconut_plantations table
CREATE TABLE IF NOT EXISTS coconut_plantations (
  id TEXT PRIMARY KEY,
  farmer_code TEXT,
  farmer_id TEXT,
  farmer_name TEXT,
  phone TEXT,
  aadhaar TEXT,
  agent_name TEXT,
  active_status TEXT,
  total_area_hectares NUMERIC,
  area_under_coconut_hectares NUMERIC,
  number_of_plots INT,
  state TEXT,
  district TEXT,
  block_tehsil_mandal TEXT,
  village TEXT,
  date_of_plantation DATE,
  spacing TEXT,
  seedlings_planted INT,
  seedlings_survived INT,
  plots JSONB DEFAULT '[]',
  mapped_area_acres NUMERIC,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  land_ownership TEXT,
  land_use_before_plantation TEXT,
  tree_clearance_before_plantation TEXT,
  burning_trees_for_site_preparation TEXT,
  age_of_sapling_months INT,
  land_patta_survey_number TEXT,
  plantation_model TEXT,
  source_of_nursery TEXT,
  type_of_variety TEXT,
  size_of_pit TEXT,
  mode_of_irrigation TEXT,
  kharif_crop TEXT,
  kharif_crop_duration_days INT,
  rabi_crop TEXT,
  rabi_crop_duration_days INT,
  nitrogen_qty_kg NUMERIC,
  phosphorous_qty_kg NUMERIC,
  potassium_qty_kg NUMERIC,
  organic_qty_kg NUMERIC,
  other_qty_kg NUMERIC,
  cost_of_seedlings NUMERIC,
  fencing_propping_shading NUMERIC,
  land_preparation NUMERIC,
  manure_expenses NUMERIC,
  irrigation_expenses NUMERIC,
  weed_management NUMERIC,
  plant_protection NUMERIC,
  agriculture_implements NUMERIC,
  manpower_expenses NUMERIC,
  annual_fertilizers NUMERIC,
  annual_irrigations NUMERIC,
  annual_manpower NUMERIC
);

-- Create farmer_records table
CREATE TABLE IF NOT EXISTS farmer_records (
  id TEXT PRIMARY KEY,
  farmer_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  phone_number TEXT,
  email TEXT,
  national_id TEXT,
  village TEXT,
  district TEXT,
  region TEXT,
  country TEXT,
  land_size NUMERIC,
  land_unit TEXT CHECK (land_unit IN ('acres','hectares')),
  crop_types TEXT[] DEFAULT '{}',
  farming_type TEXT CHECK (farming_type IN ('subsistence','commercial','mixed')),
  signature_url TEXT,
  signature_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','corrections_needed','verified','approved','rejected')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE coconut_plantations ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_records ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow public access to coconut_plantations" ON coconut_plantations FOR ALL USING (true);
CREATE POLICY "Allow public access to farmer_records" ON farmer_records FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coconut_plantations_created_at ON coconut_plantations(created_at);
CREATE INDEX IF NOT EXISTS idx_coconut_plantations_district ON coconut_plantations(district);
CREATE INDEX IF NOT EXISTS idx_farmer_records_status ON farmer_records(status);
```

### Step 2: Add Sample Data

After creating tables, run the automatic setup:

```bash
npm run setup:supabase
```

## 📱 Manual Setup (Alternative)

If automatic setup doesn't work, add data manually:

### Sample Coconut Plantations

```sql
INSERT INTO coconut_plantations (id, farmer_name, agent_name, date_of_plantation, district, village, total_area_hectares, area_under_coconut_hectares, seedlings_planted, seedlings_survived, phone, aadhaar, created_at) VALUES
('sample_001', 'Ramesh Kumar', 'Agent Smith', '2024-01-15', 'Anantapur', 'Kalyandurg', 2.5, 1.8, 120, 115, '+919876543210', '123456789012', NOW()),
('sample_002', 'Sita Devi', 'Agent Johnson', '2024-02-20', 'Kurnool', 'Nandyal', 1.2, 0.9, 80, 75, '+918765432109', '987654321098', NOW()),
('sample_003', 'Venkatesh Reddy', 'Agent Williams', '2024-03-10', 'Chittoor', 'Tirupati', 3.0, 2.5, 150, 145, '+919876543211', '456789012345', NOW());
```

### Sample Farmer Records

```sql
INSERT INTO farmer_records (id, farmer_id, first_name, last_name, phone_number, email, village, district, region, country, land_size, land_unit, crop_types, farming_type, status, created_by, created_at) VALUES
('farmer_001', 'FR001', 'Ramesh', 'Kumar', '+919876543210', 'ramesh@example.com', 'Kalyandurg', 'Anantapur', 'Andhra Pradesh', 'India', 2.5, 'hectares', ARRAY['coconut', 'mango'], 'commercial', 'verified', 'system', NOW()),
('farmer_002', 'FR002', 'Sita', 'Devi', '+918765432109', 'sita@example.com', 'Nandyal', 'Kurnool', 'Andhra Pradesh', 'India', 1.2, 'hectares', ARRAY['coconut'], 'subsistence', 'submitted', 'system', NOW());
```

## ✅ Verification

After setup, your application should show:

1. **Coconut Plantations page**: 3 sample records with:
   - Date of Plantation
   - Agent Name
   - Submitted status
   - District, Village, etc.

2. **Farmer Records page**: 2 sample records with:
   - Farmer details
   - Contact information
   - Land information

3. **Validator Dashboard**: Summary statistics

## 🚀 Start Application

```bash
cd Agroforestry
npm run dev
```

## 🔧 Troubleshooting

### "No rows in coconut_plantations table"
- Run the SQL migration first
- Check table exists in Supabase Dashboard → Table Editor
- Verify RLS policies allow access

### "Supabase not configured"
- Check `.env` file has correct credentials
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart development server

### Data not showing
- Check browser console for errors
- Verify network requests in DevTools
- Check Supabase logs for errors

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard for table creation
2. Verify environment variables
3. Check browser console for JavaScript errors
4. Review network requests in DevTools
