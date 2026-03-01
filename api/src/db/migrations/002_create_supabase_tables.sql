-- Create tables in Supabase for the frontend application
-- These tables mirror the Railway database structure

-- Users table (login / roles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('field_agent','data_validator','verified_officer','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farmer records (main agroforestry records)
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
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Mirrored from coconut_submissions when record comes from Field Agent Coconut Registration
  block_tehsil_mandal TEXT,
  date_of_plantation DATE,
  seedlings_planted INT,
  seedlings_survived INT,
  agent_name TEXT,
  total_area_hectares NUMERIC,
  area_under_coconut_hectares NUMERIC,
  land_ownership TEXT,
  land_use_before_plantation TEXT,
  type_of_variety TEXT,
  plantation_model TEXT,
  active_status TEXT,
  spacing TEXT,
  mode_of_irrigation TEXT,
  number_of_plots INT
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  farmer_record_id TEXT NOT NULL REFERENCES farmer_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('national_id','land_title','photo','other')),
  url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE
);

-- Validation history
CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  farmer_record_id TEXT NOT NULL REFERENCES farmer_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted','approved','rejected','correction_requested','corrected')),
  performed_by TEXT NOT NULL REFERENCES users(id),
  performed_by_role TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  comments TEXT
);

-- Coconut plantations (view of coconut_submissions data)
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
  -- Land information
  land_ownership TEXT,
  land_use_before_plantation TEXT,
  tree_clearance_before_plantation TEXT,
  -- Site preparation
  burning_trees_for_site_preparation TEXT,
  age_of_sapling_months INT,
  land_patta_survey_number TEXT,
  plantation_model TEXT,
  source_of_nursery TEXT,
  -- Planting & irrigation
  type_of_variety TEXT,
  size_of_pit TEXT,
  mode_of_irrigation TEXT,
  kharif_crop TEXT,
  kharif_crop_duration_days INT,
  rabi_crop TEXT,
  rabi_crop_duration_days INT,
  -- Fertilizer (kg)
  nitrogen_qty_kg NUMERIC,
  phosphorous_qty_kg NUMERIC,
  potassium_qty_kg NUMERIC,
  organic_qty_kg NUMERIC,
  other_qty_kg NUMERIC,
  -- Cost
  cost_of_seedlings NUMERIC,
  fencing_propping_shading NUMERIC,
  land_preparation NUMERIC,
  -- Expenses
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

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE coconut_plantations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for security)
CREATE POLICY "Allow public read access to coconut_plantations" ON coconut_plantations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to farmer_records" ON farmer_records FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_farmer_records_status ON farmer_records(status);
CREATE INDEX IF NOT EXISTS idx_farmer_records_created_by ON farmer_records(created_by);
CREATE INDEX IF NOT EXISTS idx_coconut_plantations_created_at ON coconut_plantations(created_at);
CREATE INDEX IF NOT EXISTS idx_coconut_plantations_district ON coconut_plantations(district);
