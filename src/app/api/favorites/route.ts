import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../_utils/server-client'

export async function POST(req: NextRequest) {
  try {
    console.log('[FAVORITES API] Starting request to add a favorite...')
    
    // Get request data
    const { imageId, authToken } = await req.json()
    console.log('[FAVORITES API] Received request for image:', imageId)
    
    if (!imageId) {
      console.log('[FAVORITES API] No image ID provided')
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }
    
    if (!authToken) {
      console.log('[FAVORITES API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[FAVORITES API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[FAVORITES API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[FAVORITES API] Invalid auth token:', userError || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('[FAVORITES API] User authenticated with ID:', user.id)
    
    // Before checking the image, ensure profile exists
    console.log('[FAVORITES API] Ensuring profile exists...')
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!existingProfile) {
      console.log('[FAVORITES API] Profile does not exist, creating new profile')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user'
        })
      
      if (profileError && profileError.code !== '23505') {
        console.error('[FAVORITES API] Error creating profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }
      console.log('[FAVORITES API] Profile created successfully')
    } else {
      console.log('[FAVORITES API] Profile already exists:', existingProfile.id)
    }
    
    // Check if the image exists
    console.log('[FAVORITES API] Checking if image exists...')
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('id')
      .eq('id', imageId)
      .single()
    
    if (imageError) {
      console.error('[FAVORITES API] Error checking image:', imageError)
      return NextResponse.json(
        { error: 'Failed to check if image exists' },
        { status: 500 }
      )
    }
    
    if (!image) {
      console.log('[FAVORITES API] Image not found')
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }
    
    console.log('[FAVORITES API] Image found:', image.id)
    
    // Check if already favorited
    console.log('[FAVORITES API] Checking if already favorited...')
    const { data: existingFavorite, error: favoriteCheckError } = await supabase
      .from('favorites')
      .select('id')
      .eq('profile_id', user.id)
      .eq('image_id', imageId)
      .maybeSingle()
    
    if (favoriteCheckError) {
      console.error('[FAVORITES API] Error checking existing favorite:', favoriteCheckError)
      return NextResponse.json(
        { error: 'Failed to check if already favorited' },
        { status: 500 }
      )
    }
    
    if (existingFavorite) {
      console.log('[FAVORITES API] Image is already favorited:', existingFavorite.id)
      return NextResponse.json(
        { error: 'Image is already favorited', favorite: existingFavorite },
        { status: 400 }
      )
    }
    
    // Add to favorites
    console.log('[FAVORITES API] Adding image to favorites...')
    const { data: favorite, error: favoriteError } = await supabase
      .from('favorites')
      .insert({
        profile_id: user.id,
        image_id: imageId
      })
      .select()
    
    if (favoriteError) {
      console.error('[FAVORITES API] Error adding favorite:', favoriteError)
      return NextResponse.json(
        { error: 'Failed to favorite image' },
        { status: 500 }
      )
    }
    
    console.log('[FAVORITES API] Successfully favorited image:', favorite?.[0]?.id)
    return NextResponse.json({ success: true, favorite: favorite?.[0] })
  } catch (error) {
    console.error('[FAVORITES API] Unhandled error:', error)
    return NextResponse.json(
      { error: 'An error occurred while favoriting the image' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('[FAVORITES API] Starting request to remove a favorite...')
    
    // Get the auth token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    // Get the image ID from the query parameter
    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId')
    console.log('[FAVORITES API] Request to unfavorite image:', imageId)
    
    if (!imageId) {
      console.log('[FAVORITES API] No image ID provided')
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }
    
    if (!authToken) {
      console.log('[FAVORITES API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[FAVORITES API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[FAVORITES API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[FAVORITES API] Invalid auth token:', userError || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('[FAVORITES API] User authenticated with ID:', user.id)
    
    // Remove from favorites
    console.log('[FAVORITES API] Removing from favorites...')
    const { data, error: favoriteError } = await supabase
      .from('favorites')
      .delete()
      .eq('profile_id', user.id)
      .eq('image_id', imageId)
      .select()
    
    if (favoriteError) {
      console.error('[FAVORITES API] Error removing favorite:', favoriteError)
      return NextResponse.json(
        { error: 'Failed to unfavorite image' },
        { status: 500 }
      )
    }
    
    console.log('[FAVORITES API] Successfully removed favorite, items affected:', data?.length || 0)
    return NextResponse.json({ success: true, removed: data?.length || 0 })
  } catch (error) {
    console.error('[FAVORITES API] Unhandled error:', error)
    return NextResponse.json(
      { error: 'An error occurred while unfavoriting the image' },
      { status: 500 }
    )
  }
} 