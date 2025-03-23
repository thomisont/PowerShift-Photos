import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../_utils/server-client'

export async function POST(req: NextRequest) {
  try {
    console.log('[IMAGES API] Starting request to save image...')
    
    // Get request data
    const { imageUrl, prompt, title, description, isPublic, modelParameters, authToken } = await req.json()
    
    if (!imageUrl || !prompt) {
      console.log('[IMAGES API] Missing required fields: imageUrl or prompt')
      return NextResponse.json(
        { error: 'Image URL and prompt are required' },
        { status: 400 }
      )
    }
    
    if (!authToken) {
      console.log('[IMAGES API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[IMAGES API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[IMAGES API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[IMAGES API] Invalid auth token:', userError?.message || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    console.log('[IMAGES API] User authenticated with ID:', userId)
    
    // ALWAYS create the profile first to avoid foreign key issues
    console.log('[IMAGES API] Ensuring profile exists before saving image...')
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (!existingProfile) {
      console.log('[IMAGES API] Profile does not exist, creating new profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: user.email?.split('@')[0] || 'user'
        })
      
      if (profileError) {
        if (profileError.code === '23505') {
          // Duplicate key error - profile was created by another request
          console.log('[IMAGES API] Profile already exists (race condition), continuing...')
        } else {
          console.error('[IMAGES API] Failed to create profile:', 
            JSON.stringify({
              code: profileError.code,
              message: profileError.message,
              details: profileError.details
            })
          )
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          )
        }
      } else {
        console.log('[IMAGES API] Profile created successfully')
      }
    } else {
      console.log('[IMAGES API] Profile already exists:', existingProfile.id)
    }
    
    // Now save the image with full confidence that the profile exists
    console.log('[IMAGES API] Saving image now that profile exists...')
    
    // Process the model parameters to ensure it's valid JSON
    let processedModelParameters = {};
    try {
      // If it's a string, try to parse it
      if (typeof modelParameters === 'string') {
        processedModelParameters = JSON.parse(modelParameters);
      } 
      // If it's already an object, use it directly
      else if (modelParameters && typeof modelParameters === 'object') {
        processedModelParameters = modelParameters;
      }
      console.log('[IMAGES API] Processed model parameters:', processedModelParameters);
    } catch (parseError) {
      console.error('[IMAGES API] Error parsing model parameters:', parseError);
      console.log('[IMAGES API] Using empty object for model parameters');
      // Continue with empty object if parsing fails
    }
    
    // Simplify data to the minimum required
    const imageData = {
      owner_id: userId,
      image_url: imageUrl,
      title: title || 'Generated Image',
      description: description || '',
      prompt,
      is_public: isPublic || false,
      model_parameters: processedModelParameters
    }
    
    console.log('[IMAGES API] Image data to save:', JSON.stringify(imageData, null, 2))
    
    const { data: image, error: imageError } = await supabase
      .from('images')
      .insert(imageData)
      .select()
    
    // Detailed error logging
    if (imageError) {
      console.error('[IMAGES API] Error saving image:', 
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
      console.error('[IMAGES API] No image data returned from successful insert')
      return NextResponse.json(
        { error: 'Failed to save image: No data returned' },
        { status: 500 }
      )
    }
    
    console.log('[IMAGES API] Image saved successfully:', image[0].id)
    
    // Try to auto-favorite, but don't fail if it doesn't work
    try {
      console.log('[IMAGES API] Auto-favoriting image...')
      const { error: favoriteError } = await supabase
        .from('favorites')
        .insert({
          profile_id: userId,
          image_id: image[0].id
        })
      
      if (favoriteError) {
        console.log('[IMAGES API] Failed to favorite image:', favoriteError.message)
      } else {
        console.log('[IMAGES API] Image favorited successfully')
      }
    } catch (favoriteError) {
      console.log('[IMAGES API] Exception favoriting image:', favoriteError)
    }
    
    return NextResponse.json({ success: true, image: image[0] })
  } catch (error) {
    console.error('[IMAGES API] Unhandled error:', error)
    // Return a more descriptive error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `An error occurred while saving the image: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('[IMAGES API] Starting request to get favorited images...')
    
    // Get the auth token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    if (!authToken) {
      console.log('[IMAGES API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[IMAGES API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[IMAGES API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[IMAGES API] Invalid auth token:', userError || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('[IMAGES API] User authenticated with ID:', user.id)
    
    // Get all favorited images for the current user
    console.log('[IMAGES API] Fetching favorites...')
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('image_id')
      .eq('profile_id', user.id)

    if (favoritesError) {
      console.error('[IMAGES API] Error fetching favorites:', favoritesError)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    if (!favorites || favorites.length === 0) {
      console.log('[IMAGES API] No favorites found')
      return NextResponse.json({ images: [] })
    }

    console.log(`[IMAGES API] Found ${favorites.length} favorites`)
    const imageIds = favorites.map(fav => fav.image_id)

    // Get the actual images
    console.log('[IMAGES API] Fetching images...')
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .in('id', imageIds)
      .order('created_at', { ascending: false })
    
    if (imagesError) {
      console.error('[IMAGES API] Error fetching images:', imagesError)
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      )
    }
    
    console.log(`[IMAGES API] Returning ${images?.length || 0} images`)
    return NextResponse.json({ images: images || [] })
  } catch (error) {
    console.error('[IMAGES API] Unhandled error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching images' },
      { status: 500 }
    )
  }
} 