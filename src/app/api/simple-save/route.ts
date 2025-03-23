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

// This is a simplified version of the image saving API for diagnostics
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString()
    const entry = `[${timestamp}] ${message}`
    logs.push(entry)
    console.log(entry)
  }
  
  try {
    log('SIMPLE-SAVE: Starting simplified image save test')
    
    // 1. Get Supabase credentials from env
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      log('SIMPLE-SAVE: Missing Supabase credentials')
      return NextResponse.json({
        error: 'Configuration error: Missing Supabase credentials',
        logs
      }, { status: 500 })
    }
    
    // 2. Parse request body with fallbacks for testing
    const body = await req.json().catch(() => ({}))
    const { 
      imageUrl = 'https://placekitten.com/300/300',
      title = 'Simple Test Image',
      description = 'Created with simple-save API',
      prompt = 'Test prompt for simplified save',
      authToken
    } = body
    
    log(`SIMPLE-SAVE: Got request with imageUrl=${imageUrl?.substring(0, 20)}...`)
    
    // 3. Create Supabase client
    log('SIMPLE-SAVE: Creating Supabase client')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      },
      // Add custom auth header if provided
      ...(authToken && {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      })
    })
    
    // 4. Get user (or use test ID if no auth)
    let userId: string
    
    if (authToken) {
      log('SIMPLE-SAVE: Getting user from auth token')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        log(`SIMPLE-SAVE: Auth error: ${userError?.message || 'No user found'}`)
        return NextResponse.json({
          error: `Authentication error: ${userError?.message || 'No user found'}`,
          logs
        }, { status: 401 })
      }
      
      userId = userData.user.id
      log(`SIMPLE-SAVE: Got authenticated user: ${userId}`)
    } else {
      // Generate a test user ID (valid UUID format)
      userId = generateUUID();
      log(`SIMPLE-SAVE: Using generated UUID for test user: ${userId}`)
    }
    
    // 5. Create or get profile
    log('SIMPLE-SAVE: Checking for existing profile')
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
      
    if (profileCheckError) {
      log(`SIMPLE-SAVE: Error checking profile: ${profileCheckError.message}`)
      return NextResponse.json({
        error: `Profile check error: ${profileCheckError.message}`,
        details: profileCheckError,
        logs
      }, { status: 500 })
    }
    
    if (!profile) {
      log('SIMPLE-SAVE: Profile not found, creating new profile')
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: 'simple_test_user'
        })
        
      if (createProfileError) {
        log(`SIMPLE-SAVE: Error creating profile: ${createProfileError.message}`)
        return NextResponse.json({
          error: `Profile creation error: ${createProfileError.message}`,
          details: createProfileError,
          logs
        }, { status: 500 })
      }
      
      log('SIMPLE-SAVE: Profile created successfully')
    } else {
      log(`SIMPLE-SAVE: Profile exists: ${profile.id}`)
    }
    
    // 6. Save the image
    log('SIMPLE-SAVE: Saving image')
    const imageData = {
      owner_id: userId,
      image_url: imageUrl,
      title,
      description,
      prompt, // Make sure prompt field is included
      is_public: true,
      model_parameters: { source: 'simple-save', timestamp: Date.now() }
    }
    
    log(`SIMPLE-SAVE: Image data: ${JSON.stringify(imageData)}`)
    
    const { data: savedImage, error: saveError } = await supabase
      .from('images')
      .insert(imageData)
      .select()
      
    if (saveError) {
      log(`SIMPLE-SAVE: Error saving image: ${saveError.message}`)
      return NextResponse.json({
        error: `Image save error: ${saveError.message}`,
        details: saveError,
        logs
      }, { status: 500 })
    }
    
    if (!savedImage || savedImage.length === 0) {
      log('SIMPLE-SAVE: No image data returned')
      return NextResponse.json({
        error: 'No image data returned from successful insert',
        logs
      }, { status: 500 })
    }
    
    // 7. Return success with timing info
    const duration = Date.now() - startTime
    log(`SIMPLE-SAVE: Image saved successfully in ${duration}ms: ${savedImage[0].id}`)
    
    return NextResponse.json({
      success: true,
      image: savedImage[0],
      duration,
      logs
    })
    
  } catch (error: any) {
    log(`SIMPLE-SAVE: Unhandled error: ${error?.message || 'Unknown error'}`)
    
    return NextResponse.json({
      error: `Unhandled error: ${error?.message || 'Unknown error'}`,
      stack: error?.stack,
      logs
    }, { status: 500 })
  }
} 