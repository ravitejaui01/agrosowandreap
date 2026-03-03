#!/usr/bin/env node

/**
 * Create Storage RLS policy so the app can list/read files in the "documents" bucket.
 * Run: node scripts/setup-storage-policy.js
 * Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in Agroforestry/.env
 * If your project uses exec_sql RPC, the policy will be applied automatically.
 * Otherwise run scripts/storage-documents-policy.sql in Supabase Dashboard → SQL Editor.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../Agroforestry/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const POLICY_SQL = `
-- Drop if exists so re-run is safe
DROP POLICY IF EXISTS "Allow read documents bucket" ON storage.objects;

-- Allow SELECT (list/read) on storage.objects for bucket 'documents'
CREATE POLICY "Allow read documents bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );
`;

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Agroforestry/.env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 Applying Storage policy for "documents" bucket...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: POLICY_SQL });

  if (error) {
    console.error('❌ Failed to apply policy:', error.message);
    console.log('\n📋 Apply manually: Supabase Dashboard → SQL Editor → run scripts/storage-documents-policy.sql');
    process.exit(1);
  }

  console.log('✅ Storage policy "Allow read documents bucket" applied. Section 2 document list should work now.');
}

main();
