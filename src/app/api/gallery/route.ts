import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../_utils/server-client'
import { Profile } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    console.log('[GALLERY API] Starting request for public images...')
    
    // Create a supabase client
    const supabase = getSupabaseClient()
    console.log('[GALLERY API] Supabase client created')
    
    // First try a simple query to check connectivity
    console.log('[GALLERY API] Testing database connectivity...')
    const { error: testError } = await supabase.from('images').select('id').limit(1)
    
    if (testError) {
      console.error('[GALLERY API] Database connectivity test failed:', testError)
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Get all public images - simplified query with separate profile fetching
    console.log('[GALLERY API] Fetching public images...')
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (imagesError) {
      console.error('[GALLERY API] Error fetching public images:', imagesError)
      return NextResponse.json(
        { error: 'Failed to fetch public images' },
        { status: 500 }
      )
    }
    
    if (!images || images.length === 0) {
      console.log('[GALLERY API] No public images found')
      return NextResponse.json({ images: [] })
    }
    
    // Extract all owner IDs from the images
    console.log(`[GALLERY API] Found ${images.length} public images, fetching profile data...`)
    const ownerIds = Array.from(new Set(images.map(img => img.owner_id)))
    
    // Fetch profiles
    let profiles: Profile[] = [];
    let profilesError = null;
    
    if (ownerIds.length > 0) {
      // Split the ownerIds into chunks to avoid potential query size limitations
      const chunkSize = 10;
      const ownerIdChunks = [];
      
      for (let i = 0; i < ownerIds.length; i += chunkSize) {
        ownerIdChunks.push(ownerIds.slice(i, i + chunkSize));
      }
      
      console.log(`[GALLERY API] Fetching profiles in ${ownerIdChunks.length} chunks...`);
      
      // Fetch profiles for each chunk and combine the results
      for (const chunk of ownerIdChunks) {
        const { data: chunkProfiles, error: chunkError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', chunk);
        
        if (chunkError) {
          profilesError = chunkError;
          console.error(`[GALLERY API] Error fetching profile chunk:`, chunkError);
          break;
        }
        
        if (chunkProfiles && chunkProfiles.length > 0) {
          profiles = profiles.concat(chunkProfiles as Profile[]);
        }
      }
    }
    
    // Create a map of profile ID to username
    const profileMap = new Map()
    
    if (profilesError) {
      console.error('[GALLERY API] Error fetching profiles:', profilesError)
      // Continue without profiles, just use placeholder names
    } else if (profiles && profiles.length > 0) {
      console.log(`[GALLERY API] Retrieved ${profiles.length} profiles`)
      
      // Map profile IDs to usernames for quick lookup
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile.username)
      })
    } else {
      console.log('[GALLERY API] No profiles found for image owners')
    }
    
    // Add username to images
    const enrichedImages = images.map(image => ({
      ...image,
      username: profileMap.get(image.owner_id) || 'Unknown User'
    }))
    
    console.log(`[GALLERY API] Returning ${enrichedImages.length} enriched images`)
    return NextResponse.json({ images: enrichedImages })
  } catch (error) {
    console.error('[GALLERY API] Unhandled error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching public images' },
      { status: 500 }
    )
  }
} 