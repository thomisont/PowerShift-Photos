import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../_utils/server-client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[IMAGE-UPDATE API] Starting request to update image:', params.id)
    const imageId = params.id
    
    // Get auth token from Authorization header
    const authHeader = req.headers.get('Authorization')
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    if (!authToken) {
      console.log('[IMAGE-UPDATE API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[IMAGE-UPDATE API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[IMAGE-UPDATE API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[IMAGE-UPDATE API] Invalid auth token:', userError?.message || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('[IMAGE-UPDATE API] User authenticated with ID:', user.id)
    
    const body = await req.json()
    console.log('[IMAGE-UPDATE API] Update data:', JSON.stringify(body))
    
    // Ensure user is updating their own image
    console.log('[IMAGE-UPDATE API] Verifying image ownership')
    const { data: imageData, error: fetchError } = await supabase
      .from('images')
      .select('owner_id')
      .eq('id', imageId)
      .single()
    
    if (fetchError || !imageData) {
      console.error('[IMAGE-UPDATE API] Image not found:', fetchError?.message)
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }
    
    if (imageData.owner_id !== user.id) {
      console.error('[IMAGE-UPDATE API] Unauthorized update attempt - image owner:', imageData.owner_id, 'user:', user.id)
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own images' },
        { status: 403 }
      )
    }
    
    // Update the image
    console.log('[IMAGE-UPDATE API] Updating image with new data')
    const { data, error } = await supabase
      .from('images')
      .update(body)
      .eq('id', imageId)
      .select()
    
    if (error) {
      console.error('[IMAGE-UPDATE API] Error updating image:', error)
      return NextResponse.json(
        { error: 'Failed to update image: ' + error.message },
        { status: 500 }
      )
    }
    
    console.log('[IMAGE-UPDATE API] Image updated successfully')
    return NextResponse.json({ success: true, image: data[0] })
  } catch (error) {
    console.error('[IMAGE-UPDATE API] Unhandled error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `An error occurred while updating the image: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[IMAGE-DELETE API] Starting request to delete image:', params.id)
    const imageId = params.id
    
    // Get auth token from Authorization header
    const authHeader = req.headers.get('Authorization')
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    if (!authToken) {
      console.log('[IMAGE-DELETE API] No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create client with auth token
    console.log('[IMAGE-DELETE API] Creating Supabase client with auth token')
    const supabase = getSupabaseClient(authToken)
    
    // Get the user ID from the token
    console.log('[IMAGE-DELETE API] Getting user from auth token')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[IMAGE-DELETE API] Invalid auth token:', userError?.message || 'No user found')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    console.log('[IMAGE-DELETE API] User authenticated with ID:', user.id)
    
    // Ensure user is deleting their own image
    console.log('[IMAGE-DELETE API] Verifying image ownership')
    const { data: imageData, error: fetchError } = await supabase
      .from('images')
      .select('owner_id')
      .eq('id', imageId)
      .single()
    
    if (fetchError || !imageData) {
      console.error('[IMAGE-DELETE API] Image not found:', fetchError?.message)
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }
    
    if (imageData.owner_id !== user.id) {
      console.error('[IMAGE-DELETE API] Unauthorized delete attempt - image owner:', imageData.owner_id, 'user:', user.id)
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own images' },
        { status: 403 }
      )
    }
    
    // First delete any favorites for this image
    console.log('[IMAGE-DELETE API] Deleting favorites for image')
    const { error: favoriteDeleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('image_id', imageId)
    
    if (favoriteDeleteError) {
      console.error('[IMAGE-DELETE API] Error deleting favorites:', favoriteDeleteError)
      // Continue with image deletion anyway
    }
    
    // Delete the image
    console.log('[IMAGE-DELETE API] Deleting image')
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
    
    if (error) {
      console.error('[IMAGE-DELETE API] Error deleting image:', error)
      return NextResponse.json(
        { error: 'Failed to delete image: ' + error.message },
        { status: 500 }
      )
    }
    
    console.log('[IMAGE-DELETE API] Image deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IMAGE-DELETE API] Unhandled error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `An error occurred while deleting the image: ${errorMessage}` },
      { status: 500 }
    )
  }
} 