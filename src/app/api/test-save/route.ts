import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Generate a valid UUID v4 format string (simplified version)
function generateUUID() {
  // Generate random hexadecimal digits
  const randomHex = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  // Format as UUID with dashes in the right places
  return `${randomHex.slice(0, 8)}-${randomHex.slice(8, 12)}-4${randomHex.slice(13, 16)}-${
    '89ab'[Math.floor(Math.random() * 4)]
  }${randomHex.slice(17, 20)}-${randomHex.slice(20, 32)}`;
}

export async function GET(req: NextRequest) {
  try {
    console.log('[TEST-SAVE API] Starting test save operation')
    
    // Create a new supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[TEST-SAVE API] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }
    
    console.log('[TEST-SAVE API] Creating Supabase client...')
    console.log('[TEST-SAVE API] Supabase URL:', supabaseUrl.substring(0, 15) + '...')
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
    
    // Check database connection
    console.log('[TEST-SAVE API] Testing database connection...')
    const { error: testError } = await supabase.from('images').select('id').limit(1)
    
    if (testError) {
      console.error('[TEST-SAVE API] Database connection test failed:', testError)
      return NextResponse.json(
        { error: 'Failed to connect to database: ' + testError.message },
        { status: 500 }
      )
    }
    
    console.log('[TEST-SAVE API] Database connection successful')
    
    // Generate a test user ID (valid UUID format)
    const testUserId = generateUUID();
    
    // Step 1: Create a test profile
    console.log('[TEST-SAVE API] Creating test profile with ID:', testUserId)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        username: 'testuser_' + Date.now()
      })
    
    if (profileError) {
      console.error('[TEST-SAVE API] Error creating profile:', 
        JSON.stringify({
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
      )
      return NextResponse.json(
        { error: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }
    
    console.log('[TEST-SAVE API] Test profile created successfully')
    
    // Step 2: Create a test image
    console.log('[TEST-SAVE API] Creating test image...')
    const timestamp = Date.now()
    const imageData = {
      owner_id: testUserId,
      image_url: `https://placekitten.com/200/300?test=${timestamp}`,
      title: 'Test Image ' + timestamp,
      description: 'Test Description',
      prompt: 'Test Prompt',
      is_public: true,
      model_parameters: { test: true, timestamp }
    }
    
    console.log('[TEST-SAVE API] Image data:', JSON.stringify(imageData, null, 2))
    
    const { data: image, error: imageError } = await supabase
      .from('images')
      .insert(imageData)
      .select()
    
    if (imageError) {
      console.error('[TEST-SAVE API] Error saving image:', 
        JSON.stringify({
          code: imageError.code,
          message: imageError.message,
          details: imageError.details,
          hint: imageError.hint
        })
      )
      return NextResponse.json(
        { error: 'Failed to save image: ' + imageError.message },
        { status: 500 }
      )
    }
    
    if (!image || image.length === 0) {
      console.error('[TEST-SAVE API] No image data returned')
      return NextResponse.json(
        { error: 'Failed to save image: No data returned' },
        { status: 500 }
      )
    }
    
    console.log('[TEST-SAVE API] Test image saved successfully:', image[0].id)
    
    // Test reading the image back to verify it was saved correctly
    console.log('[TEST-SAVE API] Verifying saved image...')
    const { data: verifyImage, error: verifyError } = await supabase
      .from('images')
      .select('*')
      .eq('id', image[0].id)
      .single()
    
    if (verifyError) {
      console.error('[TEST-SAVE API] Error verifying image:', verifyError)
      return NextResponse.json(
        { 
          warning: 'Image was saved but could not be verified: ' + verifyError.message,
          image: image[0]
        }, 
        { status: 200 }
      )
    }
    
    console.log('[TEST-SAVE API] Verification successful:', verifyImage.id)
    console.log('[TEST-SAVE API] model_parameters:', verifyImage.model_parameters)
    
    // Return success with test data
    return NextResponse.json({
      success: true,
      message: 'Test image created and verified successfully',
      testUserId,
      image: verifyImage
    })
  } catch (error) {
    console.error('[TEST-SAVE API] Unhandled error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Test failed: ${errorMessage}` },
      { status: 500 }
    )
  }
} 