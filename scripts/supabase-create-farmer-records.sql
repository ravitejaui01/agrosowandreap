-- Run this in Supabase Dashboard → SQL Editor to create farmer_records and the validator user.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).

-- 1. Users table (required for farmer_records.created_by FK)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('field_agent','data_validator','verified_officer','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Farmer records table (Validator Records / Approve flow)
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
  state TEXT,
  region TEXT,
  country TEXT,
  land_size NUMERIC,
  land_unit TEXT CHECK (land_unit IN ('acres','hectares')),
  crop_types TEXT[] DEFAULT '{}',
  farming_type TEXT CHECK (farming_type IN ('subsistence','commercial','mixed')),
  signature_url TEXT,
  signature_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','corrections_needed','verified','approved','rejected')),
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
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

-- 3. Validator user (so created_by = 'data_validator' works on insert)
INSERT INTO users (id, name, email, role)
VALUES ('data_validator', 'Validator', 'validator@system', 'data_validator')
ON CONFLICT (id) DO NOTHING;

-- 4. Allow anon to read/insert/update farmer_records (for frontend)
ALTER TABLE farmer_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read farmer_records" ON farmer_records;
CREATE POLICY "Allow read farmer_records" ON farmer_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert farmer_records" ON farmer_records;
CREATE POLICY "Allow insert farmer_records" ON farmer_records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update farmer_records" ON farmer_records;
CREATE POLICY "Allow update farmer_records" ON farmer_records FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete farmer_records" ON farmer_records;
CREATE POLICY "Allow delete farmer_records" ON farmer_records FOR DELETE USING (true);

-- 5. Add state column if table already existed without it
ALTER TABLE farmer_records ADD COLUMN IF NOT EXISTS state TEXT;

-- 6. Index for list ordering
CREATE INDEX IF NOT EXISTS idx_farmer_records_created_at ON farmer_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_records_status ON farmer_records(status);
