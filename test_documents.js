// Test script to verify document detection for farmer 30809
const { listDocumentsByFarmerCode } = require('./Agroforestry/src/lib/supabase.ts');

async function testFarmer30809() {
  console.log('Testing document detection for farmer 30809...');
  
  try {
    const documents = await listDocumentsByFarmerCode('30809');
    console.log('Found documents:', documents.length);
    documents.forEach(doc => {
      console.log(`- ${doc.name}: ${doc.url}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFarmer30809();
