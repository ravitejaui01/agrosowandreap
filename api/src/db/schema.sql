-- Users (login / roles)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  farmer_record_id TEXT NOT NULL REFERENCES farmer_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('national_id','land_title','photo','other')),
  url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  farmer_record_id TEXT NOT NULL REFERENCES farmer_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted','approved','rejected','correction_requested','corrected')),
  performed_by TEXT NOT NULL REFERENCES users(id),
  performed_by_role TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  comments TEXT
);

-- Coconut submissions (field agent app)
CREATE TABLE IF NOT EXISTS coconut_submissions (
  id TEXT PRIMARY KEY,
  farmer_name TEXT NOT NULL,
  phone TEXT,
  aadhaar TEXT,
  agent_name TEXT NOT NULL,
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
  created_by TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farmer_records_status ON farmer_records(status);
CREATE INDEX IF NOT EXISTS idx_farmer_records_created_by ON farmer_records(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_farmer_record_id ON documents(farmer_record_id);
CREATE INDEX IF NOT EXISTS idx_validation_history_farmer_record_id ON validation_history(farmer_record_id);
