// Direct Supabase test script - run with: node test-save.js
// This script tests Supabase connectivity and image saving directly

// Load environment variables from .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch (err) {
  console.log('dotenv not installed, skipping .env.local loading');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set (hidden for security)' : 'NOT SET');
console.log('Supabase Key:', supabaseKey ? 'Set (hidden for security)' : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('\nError: Missing Supabase credentials');
  console.log('\nTip: Create a .env.local file with:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n');
  process.exit(1);
}

console.log('\nThis is a standalone test script that doesn\'t depend on Next.js');
console.log('It will try to directly test Supabase connection and image saving\n');

// Import supabase client if available
let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client created successfully');
} catch (err) {
  console.error('Failed to create Supabase client:', err.message);
  console.log('\nTip: Make sure @supabase/supabase-js is installed:');
  console.log('npm install @supabase/supabase-js\n');
  process.exit(1);
}

// Test Supabase connection and operations
async function runTest() {
  try {
    console.log('\n--- STARTING TEST ---\n');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('images')
      .select('id')
      .limit(1);
      
    if (connectionError) {
      throw new Error(`Connection error: ${connectionError.message}`);
    }
    
    console.log('✅ Database connection successful');
    
    // 2. Create a test profile
    console.log('\n2. Creating test profile...');
    
    // Generate a unique test user ID
    const testUserId = `test-user-${Date.now()}`;
    console.log(`Using test user ID: ${testUserId}`);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        username: `test_user_${Date.now()}`
      });
      
    if (profileError) {
      throw new Error(`Profile creation error: ${profileError.message}`);
    }
    
    console.log('✅ Test profile created successfully');
    
    // 3. Save a test image
    console.log('\n3. Saving test image...');
    
    const timestamp = Date.now();
    const imageData = {
      owner_id: testUserId,
      image_url: `https://placekitten.com/300/300?test=${timestamp}`,
      title: `Test Image ${timestamp}`,
      description: 'Created via standalone test script',
      prompt: 'Test prompt for debugging',
      is_public: true,
      model_parameters: { source: 'standalone-test', timestamp }
    };
    
    console.log('Image data:', JSON.stringify(imageData, null, 2));
    
    const { data: image, error: imageError } = await supabase
      .from('images')
      .insert(imageData)
      .select();
      
    if (imageError) {
      throw new Error(`Image save error: ${imageError.message}`);
    }
    
    if (!image || image.length === 0) {
      throw new Error('No image data returned');
    }
    
    console.log('✅ Test image saved successfully:', image[0].id);
    
    // 4. Verify the image was saved
    console.log('\n4. Verifying saved image...');
    
    const { data: verifyImage, error: verifyError } = await supabase
      .from('images')
      .select('*')
      .eq('id', image[0].id)
      .single();
      
    if (verifyError) {
      throw new Error(`Verification error: ${verifyError.message}`);
    }
    
    console.log('✅ Image verified successfully');
    console.log('\n--- TEST COMPLETED SUCCESSFULLY ---\n');
    
    return {
      success: true,
      image: verifyImage
    };
  
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runTest()
  .then(result => {
    if (result.success) {
      console.log('All tests passed successfully!');
      process.exit(0);
    } else {
      console.error('Test failed:', result.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 