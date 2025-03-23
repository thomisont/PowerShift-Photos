// Debug script to test direct image saving to Supabase
// Run with: node debug-image-save.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// These will be set in Replit Secrets later
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl ? 'Set (hidden for security)' : 'NOT SET');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set (hidden for security)' : 'NOT SET');

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data - replace with your own test values
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_IMAGE_URL = 'https://replicate.delivery/pbxt/Jmq1U5NZ84V0LhhpAsOqXgEqIiQx9YSXM0dQ5HqWJRTIHQHIA/out-0.png';

async function runTest() {
  try {
    console.log('\n--- STARTING DEBUG TEST ---');
    
    // Step 1: Sign in to get a valid session
    console.log('\n1. Signing in with test account...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (authError) {
      console.error('Authentication failed:', authError);
      console.log('\nTip: You might need to create this test user first in the Supabase Authentication dashboard');
      process.exit(1);
    }
    
    console.log('Authentication successful for user:', authData.user.id);
    
    // Step 2: Check if profile exists, create if needed
    console.log('\n2. Checking if profile exists...');
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError);
      process.exit(1);
    }
    
    if (!profile) {
      console.log('Profile does not exist, creating profile...');
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: authData.user.email.split('@')[0]
        });
      
      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        process.exit(1);
      }
      console.log('Profile created successfully');
    } else {
      console.log('Profile already exists');
    }
    
    // Step 3: Try to save an image
    console.log('\n3. Saving test image...');
    const imageData = {
      owner_id: authData.user.id,
      image_url: TEST_IMAGE_URL,
      title: 'Debug Test Image',
      description: 'Created via debug script',
      prompt: 'Test prompt for debugging',
      is_public: true,
      model_parameters: { debug: true }
    };
    
    console.log('Image data:', JSON.stringify(imageData, null, 2));
    
    const { data: image, error: imageError } = await supabase
      .from('images')
      .insert(imageData)
      .select();
    
    if (imageError) {
      console.error('Error saving image:', JSON.stringify({
        code: imageError.code,
        message: imageError.message,
        details: imageError.details,
        hint: imageError.hint
      }, null, 2));
      process.exit(1);
    }
    
    if (!image || image.length === 0) {
      console.error('No image data returned from successful insert');
      process.exit(1);
    }
    
    console.log('Image saved successfully:', image[0].id);
    
    // Step 4: Verify the image was saved by retrieving it
    console.log('\n4. Verifying image was saved...');
    const { data: savedImage, error: verifyError } = await supabase
      .from('images')
      .select('*')
      .eq('id', image[0].id)
      .single();
    
    if (verifyError) {
      console.error('Error verifying saved image:', verifyError);
      process.exit(1);
    }
    
    if (!savedImage) {
      console.error('Could not retrieve saved image');
      process.exit(1);
    }
    
    console.log('Successfully verified saved image:', savedImage.id);
    console.log('\n--- TEST COMPLETED SUCCESSFULLY ---');
    
  } catch (error) {
    console.error('Unhandled error during test:', error);
    process.exit(1);
  }
}

runTest(); 