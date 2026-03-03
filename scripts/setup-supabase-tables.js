#!/usr/bin/env node

/**
 * Create Supabase tables with coconut fields
 * This script creates the tables first, then adds sample data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from Agroforestry directory
require('dotenv').config({ path: path.join(__dirname, '../Agroforestry/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql) {
  console.log('🔄 Executing SQL:', sql.substring(0, 100) + '...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ SQL execution failed:', error);
      return false;
    }
    
    console.log('✅ SQL executed successfully');
    return true;
  } catch (err) {
    console.error('❌ SQL execution error:', err.message);
    return false;
  }
}

async function addSampleData() {
  console.log('🌱 Adding sample coconut plantation data...');
  
  const sampleData = [
    {
      id: 'sample_001',
      farmer_name: 'Ramesh Kumar',
      agent_name: 'Agent Smith',
      date_of_plantation: '2024-01-15',
      district: 'Anantapur',
      village: 'Kalyandurg',
      total_area_hectares: 2.5,
      area_under_coconut_hectares: 1.8,
      seedlings_planted: 120,
      seedlings_survived: 115,
      phone: '+919876543210',
      aadhaar: '123456789012',
      created_at: new Date().toISOString()
    },
    {
      id: 'sample_002', 
      farmer_name: 'Sita Devi',
      agent_name: 'Agent Johnson',
      date_of_plantation: '2024-02-20',
      district: 'Kurnool',
      village: 'Nandyal',
      total_area_hectares: 1.2,
      area_under_coconut_hectares: 0.9,
      seedlings_planted: 80,
      seedlings_survived: 75,
      phone: '+918765432109',
      aadhaar: '987654321098',
      created_at: new Date().toISOString()
    },
    {
      id: 'sample_003',
      farmer_name: 'Venkatesh Reddy',
      agent_name: 'Agent Williams', 
      date_of_plantation: '2024-03-10',
      district: 'Chittoor',
      village: 'Tirupati',
      total_area_hectares: 3.0,
      area_under_coconut_hectares: 2.5,
      seedlings_planted: 150,
      seedlings_survived: 145,
      phone: '+919876543211',
      aadhaar: '456789012345',
      created_at: new Date().toISOString()
    }
  ];

  try {
    const { data, error } = await supabase
      .from('coconut_plantations')
      .upsert(sampleData, { onConflict: 'id' });

    if (error) {
      console.error('❌ Failed to add sample data:', error);
      return false;
    }

    console.log(`✅ Added ${sampleData.length} sample records`);
    return true;
  } catch (err) {
    console.error('❌ Sample data error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating Supabase tables with coconut fields...\n');

  // Read and execute the table creation SQL
  const sqlPath = path.join(__dirname, '../api/src/db/migrations/002_create_supabase_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  const tableCreated = await executeSQL(sql);
  
  if (!tableCreated) {
    console.error('❌ Failed to create tables. Stopping setup.');
    process.exit(1);
  }

  console.log('');

  // Add sample data
  const sampleSuccess = await addSampleData();
  
  if (!sampleSuccess) {
    console.error('❌ Sample data failed. Stopping setup.');
    process.exit(1);
  }

  console.log('');

  // Apply Storage policy so validator Section 2 can list documents
  const policySql = `
DROP POLICY IF EXISTS "Allow read documents bucket" ON storage.objects;
CREATE POLICY "Allow read documents bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );
`;
  const policyOk = await executeSQL(policySql);
  if (!policyOk) {
    console.warn('⚠️ Storage policy not applied (run npm run setup:storage-policy or apply scripts/storage-documents-policy.sql in SQL Editor).');
  } else {
    console.log('✅ Storage policy for "documents" bucket applied.');
  }

  console.log('\n🎉 Supabase tables and sample data created successfully!');
  console.log('📱 Your application should now show data in:');
  console.log('   - Coconut Plantations page');
  console.log('   - Farmer Records page');
  console.log('   - Validator Dashboard');
}

// Run the setup
main();
