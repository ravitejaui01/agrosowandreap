#!/usr/bin/env node

/**
 * Automatic Supabase Setup Script
 * This script will:
 * 1. Create Supabase tables
 * 2. Add sample data
 * 3. Verify setup
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile(filePath) {
  console.log(`📄 Reading SQL file: ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log('🔄 Executing SQL migration...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ SQL execution failed:', error);
      return false;
    }
    
    console.log('✅ SQL migration completed successfully');
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

async function addSampleFarmerRecords() {
  console.log('👨‍🌾 Adding sample farmer records...');
  
  const sampleFarmers = [
    {
      id: 'farmer_001',
      farmer_id: 'FR001',
      first_name: 'Ramesh',
      last_name: 'Kumar',
      phone_number: '+919876543210',
      email: 'ramesh@example.com',
      village: 'Kalyandurg',
      district: 'Anantapur',
      region: 'Andhra Pradesh',
      country: 'India',
      land_size: 2.5,
      land_unit: 'hectares',
      crop_types: ['coconut', 'mango'],
      farming_type: 'commercial',
      status: 'verified',
      created_by: 'system',
      created_at: new Date().toISOString()
    },
    {
      id: 'farmer_002',
      farmer_id: 'FR002', 
      first_name: 'Sita',
      last_name: 'Devi',
      phone_number: '+918765432109',
      email: 'sita@example.com',
      village: 'Nandyal',
      district: 'Kurnool',
      region: 'Andhra Pradesh',
      country: 'India',
      land_size: 1.2,
      land_unit: 'hectares',
      crop_types: ['coconut'],
      farming_type: 'subsistence',
      status: 'submitted',
      created_by: 'system',
      created_at: new Date().toISOString()
    }
  ];

  try {
    const { data, error } = await supabase
      .from('farmer_records')
      .upsert(sampleFarmers, { onConflict: 'id' });

    if (error) {
      console.error('❌ Failed to add farmer records:', error);
      return false;
    }

    console.log(`✅ Added ${sampleFarmers.length} sample farmer records`);
    return true;
  } catch (err) {
    console.error('❌ Farmer records error:', err.message);
    return false;
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check coconut_plantations
    const { data: coconutData, error: coconutError } = await supabase
      .from('coconut_plantations')
      .select('count(*)')
      .single();

    // Check farmer_records  
    const { data: farmerData, error: farmerError } = await supabase
      .from('farmer_records')
      .select('count(*)')
      .single();

    if (coconutError || farmerError) {
      console.error('❌ Verification failed:', coconutError || farmerError);
      return false;
    }

    const coconutCount = coconutData?.count || 0;
    const farmerCount = farmerData?.count || 0;

    console.log(`✅ Verification successful:`);
    console.log(`   🌴 Coconut Plantations: ${coconutCount} records`);
    console.log(`   👨‍🌾 Farmer Records: ${farmerCount} records`);
    
    return true;
  } catch (err) {
    console.error('❌ Verification error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting automatic Supabase setup...\n');

  try {
    // Step 1: Execute migration
    const migrationPath = path.join(__dirname, '../api/src/db/migrations/002_create_supabase_tables.sql');
    const migrationSuccess = await executeSQLFile(migrationPath);
    
    if (!migrationSuccess) {
      console.error('❌ Migration failed. Stopping setup.');
      process.exit(1);
    }

    console.log('');

    // Step 2: Add sample data
    const coconutSuccess = await addSampleData();
    const farmerSuccess = await addSampleFarmerRecords();
    
    if (!coconutSuccess || !farmerSuccess) {
      console.error('❌ Sample data failed. Stopping setup.');
      process.exit(1);
    }

    console.log('');

    // Step 3: Verify setup
    const verificationSuccess = await verifySetup();
    
    if (!verificationSuccess) {
      console.error('❌ Verification failed. Please check your Supabase setup.');
      process.exit(1);
    }

    console.log('\n🎉 Supabase setup completed successfully!');
    console.log('📱 Your application should now show data in:');
    console.log('   - Coconut Plantations page');
    console.log('   - Farmer Records page');
    console.log('   - Validator Dashboard');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();
